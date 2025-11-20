import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Table names are injected via environment variables by Amplify
const getTableName = (modelName: string): string => {
  const envKey = `AMPLIFY_DATA_${modelName.toUpperCase()}_TABLE_NAME`;
  const tableName = process.env[envKey];
  if (!tableName) {
    throw new Error(`Table name not found for model: ${modelName}. Expected env var: ${envKey}`);
  }
  return tableName;
};

export interface DynamoDBItem {
  [key: string]: unknown;
}

export class DynamoDBDataClient {
  async get(modelName: string, id: string): Promise<DynamoDBItem | null> {
    const tableName = getTableName(modelName);
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { id },
      })
    );
    return result.Item ?? null;
  }

  async put(modelName: string, item: DynamoDBItem): Promise<DynamoDBItem> {
    const tableName = getTableName(modelName);
    const now = new Date().toISOString();
    const fullItem = {
      ...item,
      createdAt: item.createdAt ?? now,
      updatedAt: now,
    };
    
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: fullItem,
      })
    );
    return fullItem;
  }

  async update(modelName: string, id: string, updates: DynamoDBItem): Promise<DynamoDBItem> {
    const tableName = getTableName(modelName);
    const now = new Date().toISOString();
    
    // Build UpdateExpression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};
    
    // Always update the updatedAt timestamp
    const allUpdates = { ...updates, updatedAt: now };
    
    let index = 0;
    for (const [key, value] of Object.entries(allUpdates)) {
      if (key === 'id') continue; // Skip the key
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
      index++;
    }
    
    if (updateExpressions.length === 0) {
      throw new Error("No fields to update");
    }
    
    const result = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );
    
    return result.Attributes as DynamoDBItem;
  }

  async query(
    modelName: string,
    options: {
      indexName?: string;
      keyConditionExpression: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, unknown>;
      filterExpression?: string;
      limit?: number;
      exclusiveStartKey?: Record<string, unknown>;
    }
  ): Promise<{ items: DynamoDBItem[]; lastEvaluatedKey?: Record<string, unknown> }> {
    const tableName = getTableName(modelName);
    
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: options.indexName,
        KeyConditionExpression: options.keyConditionExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        FilterExpression: options.filterExpression,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey,
      })
    );
    
    return {
      items: result.Items as DynamoDBItem[],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async scan(
    modelName: string,
    options?: {
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, unknown>;
      limit?: number;
      exclusiveStartKey?: Record<string, unknown>;
    }
  ): Promise<{ items: DynamoDBItem[]; lastEvaluatedKey?: Record<string, unknown> }> {
    const tableName = getTableName(modelName);
    
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: options?.filterExpression,
        ExpressionAttributeNames: options?.expressionAttributeNames,
        ExpressionAttributeValues: options?.expressionAttributeValues,
        Limit: options?.limit,
        ExclusiveStartKey: options?.exclusiveStartKey,
      })
    );
    
    return {
      items: result.Items as DynamoDBItem[],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async delete(modelName: string, id: string): Promise<void> {
    const tableName = getTableName(modelName);
    
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { id },
      })
    );
  }
}

let cachedClient: DynamoDBDataClient | undefined;

export function getDBClient(): DynamoDBDataClient {
  if (!cachedClient) {
    cachedClient = new DynamoDBDataClient();
  }
  return cachedClient;
}

// Helper function to query by secondary index (e.g., studentId)
export async function queryByIndex(
  modelName: string,
  indexName: string,
  keyName: string,
  keyValue: string,
  limit?: number
): Promise<DynamoDBItem[]> {
  const client = getDBClient();
  const result = await client.query(modelName, {
    indexName,
    keyConditionExpression: `#key = :value`,
    expressionAttributeNames: { '#key': keyName },
    expressionAttributeValues: { ':value': keyValue },
    limit,
  });
  return result.items;
}

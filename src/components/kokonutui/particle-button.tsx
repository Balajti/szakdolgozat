"use client";

/**
 * @author: @dorian_baffier
 * @description: Particle Button
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
    useState,
    useRef,
    type RefObject,
    isValidElement,
    cloneElement,
    type ReactElement,
    type ReactNode,
} from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { MousePointerClick } from "lucide-react";

interface ParticleButtonProps extends ButtonProps {
    onSuccess?: () => void;
    successDuration?: number;
}

function SuccessParticles({
    buttonRef,
}: {
    buttonRef: React.RefObject<HTMLButtonElement>;
}) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return (
        <AnimatePresence>
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="fixed w-1 h-1 bg-black dark:bg-white rounded-full"
                    style={{ left: centerX, top: centerY }}
                    initial={{
                        scale: 0,
                        x: 0,
                        y: 0,
                    }}
                    animate={{
                        scale: [0, 1, 0],
                        x: [0, (i % 2 ? 1 : -1) * (Math.random() * 50 + 20)],
                        y: [0, -Math.random() * 50 - 20],
                    }}
                    transition={{
                        duration: 0.6,
                        delay: i * 0.1,
                        ease: "easeOut",
                    }}
                />
            ))}
        </AnimatePresence>
    );
}

export default function ParticleButton({
    children,
    onSuccess,
    successDuration = 1000,
    className,
    asChild,
    onClick,
    ...props
}: ParticleButtonProps) {
    const [showParticles, setShowParticles] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (props.disabled) return;
        if (onClick) {
            await onClick(e);
        }
        setShowParticles(true);

        setTimeout(() => {
            setShowParticles(false);
            onSuccess?.();
        }, successDuration);
    };

    const renderContent = () => {
        if (asChild) {
            if (!isValidElement(children)) {
                throw new Error("ParticleButton with asChild expects a single React element child.");
            }

            const childElement = children as ReactElement<{ className?: string; children?: ReactNode }>;

            return cloneElement(childElement, {
                className: cn("flex items-center gap-2", childElement.props.className),
                children: (
                    <>
                        {childElement.props.children}
                        <MousePointerClick className="h-4 w-4" />
                    </>
                ),
            });
        }

        return (
            <span className="flex items-center gap-2">
                {children}
                <MousePointerClick className="h-4 w-4" />
            </span>
        );
    };

    return (
        <>
            {showParticles && (
                <SuccessParticles
                    buttonRef={buttonRef as RefObject<HTMLButtonElement>}
                />
            )}
            <Button
                ref={buttonRef}
                onClick={handleClick}
                className={cn(
                    "relative",
                    showParticles && "scale-95",
                    "transition-transform duration-100",
                    className
                )}
                asChild={asChild}
                {...props}
            >
                {renderContent()}
            </Button>
        </>
    );
}

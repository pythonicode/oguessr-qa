import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Flag } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

const FLAG_OPTIONS = [
    { value: "too_easy", label: "Too Easy" },
    { value: "too_hard", label: "Too Hard" },
    { value: "wrong_discipline", label: "Wrong Discipline" },
    { value: "inappropriate", label: "Inappropriate" },
    { value: "bad_image", label: "Bad Image" },
    { value: "other", label: "Other" },
] as const;

type FlagValue = typeof FLAG_OPTIONS[number]["value"];

interface ReportProblemPopoverProps {
    mapId: Id<"maps">;
}

export function ReportProblemPopover({ mapId }: ReportProblemPopoverProps) {
    const [selectedFlag, setSelectedFlag] = useState<FlagValue | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const addMapFlag = useMutation(api.models.maps.mutations.addMapFlag.addMapFlag);

    const handleSubmit = async () => {
        if (!selectedFlag) return;

        setIsSubmitting(true);
        try {
            await addMapFlag({ mapId, flag: selectedFlag });
            setSubmitted(true);
            setTimeout(() => {
                setIsOpen(false);
                setSelectedFlag(null);
                setSubmitted(false);
            }, 1500);
        } catch (error) {
            console.error("Failed to report problem:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-400 dark:hover:bg-orange-500 dark:text-neutral-900 backdrop-blur-sm shadow-lg"
                >
                    <Flag className="size-4" />
                    Report Problem
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
                {submitted ? (
                    <div className="text-center py-2">
                        <div className="text-green-600 dark:text-green-400 font-medium">
                            Thanks for reporting!
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="font-semibold text-sm">What's the problem?</div>
                        <div className="space-y-1">
                            {FLAG_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    <input
                                        type="radio"
                                        name="problem-flag"
                                        value={option.value}
                                        checked={selectedFlag === option.value}
                                        onChange={() => setSelectedFlag(option.value)}
                                        className="size-4 accent-orange-500"
                                    />
                                    <span className="text-sm">{option.label}</span>
                                </label>
                            ))}
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedFlag || isSubmitting}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                            size="sm"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Report"}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}


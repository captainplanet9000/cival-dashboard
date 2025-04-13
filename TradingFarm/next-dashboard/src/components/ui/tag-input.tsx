"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

interface TagInputProps {
  placeholder?: string;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  suggestions?: string[];
  disabled?: boolean;
  maxTags?: number;
}

export function TagInput({
  placeholder = "Add tag...",
  tags,
  setTags,
  suggestions = [],
  disabled = false,
  maxTags = 10,
}: TagInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const handleAddTag = (value: string) => {
    const newTag = value.trim();
    
    if (
      newTag !== "" && 
      !tags.includes(newTag) && 
      tags.length < maxTags
    ) {
      setTags([...tags, newTag]);
      setInputValue("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.value.trim();

    if (e.key === "Enter" && value) {
      e.preventDefault();
      handleAddTag(value);
      setIsOpen(false);
    } else if (e.key === "Backspace" && !value && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (suggestion) => 
      !tags.includes(suggestion) && 
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="hover:bg-secondary">
              {tag}
              <button
                type="button"
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleRemoveTag(tag)}
                disabled={disabled}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                <span className="sr-only">Remove {tag}</span>
              </button>
            </Badge>
          ))}
          
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onBlur={() => setIsOpen(false)}
            onFocus={() => setIsOpen(true)}
            placeholder={tags.length === 0 ? placeholder : undefined}
            disabled={disabled || tags.length >= maxTags}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px] max-w-full"
          />
        </div>
      </div>
      
      {filteredSuggestions.length > 0 && isOpen && (
        <div className="relative mt-2">
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto">
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  onSelect={() => {
                    handleAddTag(suggestion);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  {suggestion}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        </div>
      )}
    </Command>
  );
}

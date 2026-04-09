import * as React from "react";

import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type RelationOption = {
  id: number;
  name: string;
};

type SingleRelationSelectorProps = {
  label: string;
  options: RelationOption[];
  selectedIds: number[];
  onSelect: (value: number) => void;
  error?: string;
  required?: boolean;
};

export default function SingleRelationSelector({
  label,
  options,
  selectedIds,
  onSelect,
  error,
  required = false,
}: SingleRelationSelectorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const optionNameById = React.useMemo(
    () => new Map(options.map((item) => [String(item.id), item.name])),
    [options],
  );
  const optionByName = React.useMemo(
    () => new Map(options.map((item) => [item.name, item])),
    [options],
  );
  const optionIdByName = React.useMemo(
    () => new Map(options.map((item) => [item.name, item.id])),
    [options],
  );
  const selectedName =
    selectedIds[0] != null
      ? (optionNameById.get(String(selectedIds[0])) ?? null)
      : null;
  return (
    <div ref={containerRef} className="grid gap-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Combobox
        items={options.map((item) => item.name)}
        itemToStringValue={(name) => String(name ?? "")}
        value={selectedName}
        onValueChange={(value) => {
          if (!value) return;
          const selectedOptionId = optionIdByName.get(String(value));
          if (selectedOptionId == null) return;
          onSelect(selectedOptionId);
        }}
      >
        <ComboboxInput
          className="w-full"
          placeholder={`Pilih ${label.toLowerCase()}`}
          aria-label={label}
          showClear
        />
        <ComboboxContent container={containerRef}>
          <ComboboxEmpty>Data tidak ditemukan.</ComboboxEmpty>
          <ComboboxList>
            {(name) => {
              const option = optionByName.get(String(name));
              if (!option) return null;
              return (
                <ComboboxItem key={option.id} value={option.name}>
                  {option.name}
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

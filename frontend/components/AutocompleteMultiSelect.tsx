import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";

interface AutocompleteMultiSelectProps<T> {
  label: string;
  options: T[];
  value: T[];
  onChange: (value: T[]) => void;
  getOptionLabel: (option: T) => string;
  isOptionEqualToValue?: (option: T, value: T) => boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

// Multi-select sibling of AutocompleteSelect (ported from VideoGameTrackarr): MUI's `multiple`
// mode shows each picked option as a chip inside the field, so the list filters need no
// separate "active filters" row to show or clear a selection.
function AutocompleteMultiSelect<T>({
  label,
  options,
  value,
  onChange,
  getOptionLabel,
  isOptionEqualToValue,
  disabled,
  fullWidth,
  placeholder,
  sx,
}: AutocompleteMultiSelectProps<T>) {
  return (
    <Autocomplete
      multiple
      options={options}
      value={value}
      onChange={(_event, newValue) => onChange(newValue)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      disabled={disabled}
      fullWidth={fullWidth}
      sx={sx}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={value.length ? undefined : placeholder} />
      )}
    />
  );
}

export default AutocompleteMultiSelect;

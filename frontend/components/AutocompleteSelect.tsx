import type { SxProps, Theme } from "@mui/material/styles";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

interface AutocompleteSelectProps<T> {
  label: string;
  options: T[];
  value: T | null;
  onChange: (value: T | null) => void;
  getOptionLabel: (option: T) => string;
  isOptionEqualToValue?: (option: T, value: T) => boolean;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  disableClearable?: boolean;
  sx?: SxProps<Theme>;
  size?: "small" | "medium";
}

// Type-to-filter replacement for the `<TextField select><MenuItem>` dropdown pattern —
// the non-freeSolo sibling of FreeSoloLookupField (picks an existing option only, no
// typing in a new value).
function AutocompleteSelect<T>({
  label,
  options,
  value,
  onChange,
  getOptionLabel,
  isOptionEqualToValue,
  disabled,
  required,
  fullWidth,
  disableClearable,
  sx,
  size,
}: AutocompleteSelectProps<T>) {
  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(_event, newValue) => onChange(newValue)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      disabled={disabled}
      fullWidth={fullWidth}
      disableClearable={disableClearable}
      sx={sx}
      size={size}
      renderInput={(params) => <TextField {...params} label={label} required={required} />}
    />
  );
}

export default AutocompleteSelect;

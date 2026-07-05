import { type ReactNode } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export interface LookupItem {
  id: number;
  label: string;
  secondary?: string;
  color?: string | null;
}

interface LookupSectionProps {
  title: string;
  items: LookupItem[];
  isLoading?: boolean;
  onDelete: (id: number) => void;
  children: ReactNode;
}

const LookupSection = ({ title, items, isLoading, onDelete, children }: LookupSectionProps) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Box sx={{ mb: 2 }}>{children}</Box>
    <Divider sx={{ mb: 1 }} />
    {isLoading ? (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    ) : items.length === 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
        None yet.
      </Typography>
    ) : (
      <List dense disablePadding>
        {items.map((item) => (
          <ListItem
            key={item.id}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label={`Delete ${item.label}`}
                onClick={() => onDelete(item.id)}
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            {item.color && (
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: item.color,
                    borderRadius: "50%",
                    border: "1px solid",
                    borderColor: "divider",
                    flexShrink: 0,
                  }}
                />
              </ListItemIcon>
            )}
            <ListItemText primary={item.label} secondary={item.secondary} />
          </ListItem>
        ))}
      </List>
    )}
  </Paper>
);

export default LookupSection;

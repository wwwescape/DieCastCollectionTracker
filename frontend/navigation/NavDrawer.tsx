import { Link, useLocation } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { navDestinations } from "./destinations";

export const NAV_DRAWER_WIDTH = 240;

const APP_BAR_HEIGHT = 64;

const NavDrawer = () => {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: NAV_DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: NAV_DRAWER_WIDTH,
          boxSizing: "border-box",
          border: "none",
          top: APP_BAR_HEIGHT,
          height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
        },
      }}
    >
      <List component="nav" aria-label="Primary" sx={{ px: 1.5 }}>
        {navDestinations.map((destination) => {
          const isSelected = location.pathname === destination.to;
          return (
            <ListItem key={destination.to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={destination.to}
                selected={isSelected}
                aria-current={isSelected ? "page" : undefined}
                sx={{ borderRadius: 999 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{destination.icon}</ListItemIcon>
                <ListItemText primary={destination.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
};

export default NavDrawer;

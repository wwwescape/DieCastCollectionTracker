import { createSvgIcon } from "@mui/material/utils";

// Material Symbols' "road" glyph: two road edges and a dashed center line. @mui/icons-material
// only ships the AddRoad/EditRoad/RemoveRoad variants, whose +/pencil/− badges would read as
// actions in the nav rather than as the Sets section.
const RoadIcon = createSvgIcon(
  <path d="M4 20V4h2v16H4Zm7 0v-4h2v4h-2Zm0-6v-4h2v4h-2Zm0-6V4h2v4h-2Zm7 12V4h2v16h-2Z" />,
  "Road"
);

export default RoadIcon;

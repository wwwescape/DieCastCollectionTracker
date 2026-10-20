import { createSvgIcon } from "@mui/material/utils";

// The Collection section's icon: a car (Material's directions_car) in the mouth of a road
// whose edges meet in a V. Drawn in currentColor so it follows the nav's selected state.
const CollectionIcon = createSvgIcon(
  <>
    <path d="M2.2 3.2 4.1 2.6 11.3 21.4 10.1 22Z" />
    <path d="M21.8 3.2 19.9 2.6 12.7 21.4 13.9 22Z" />
    <path d="M11.3 13.2h1.4v2.6h-1.4zM11.5 17.4h1v2.2h-1z" />
    <path
      transform="translate(5.4 -1.75) scale(0.55)"
      d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
    />
  </>,
  "Collection"
);

export default CollectionIcon;

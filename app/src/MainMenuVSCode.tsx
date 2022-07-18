/**
 * @license
 * Copyright 2022 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2022 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

import {
  Button,
  Menu,
  MenuItem,
  MenuList,
} from "@material-ui/core";
import { useCallback, useState } from "react";

export const MainMenu = ({
  componentSpec,
}: {
  componentSpec?: ComponentSpec;
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuButtonClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    },
    []
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <div>
      <Button
        variant="outlined"
        disableElevation
        onClick={handleMenuButtonClick}
      >
        Menu
      </Button>
      <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleClose}>
        <MenuList dense>
          {/* <MenuItem>About Cloud Pipelines</MenuItem> */}
          {/* <MenuItem>Give feedback</MenuItem> */}
        </MenuList>
      </Menu>
    </div>
  );
};

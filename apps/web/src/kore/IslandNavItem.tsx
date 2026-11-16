import { useLocation, useNavigate } from "@tanstack/react-router";
import { WavesIcon } from "lucide-react";

import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "../components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../components/ui/tooltip";

export function IslandNavItem() {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = useLocation({ select: (location) => location.pathname === "/island" });

  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
    void navigate({ to: "/island" });
  };

  return (
    <SidebarMenuItem className="shrink-0">
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarMenuButton
              aria-label="Island"
              aria-current={isActive ? "page" : undefined}
              isActive={isActive}
              onClick={handleClick}
              size="icon"
            >
              <WavesIcon />
            </SidebarMenuButton>
          }
        />
        <TooltipPopup side="top">Island</TooltipPopup>
      </Tooltip>
    </SidebarMenuItem>
  );
}

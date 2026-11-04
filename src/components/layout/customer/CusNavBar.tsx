import { useState, useId, type MouseEvent } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import mascotLogo from "../../../assets/images/mascot-logo.png";
import "./CusNavBar.css";

export type MenuId = "home" | "explore" | "consign" | "booking" | "login";

export interface MenuItem {
  id: MenuId;
  label: string;
  href: string;
  disabled?: boolean;
}

export interface CusNavBarProps {
  initialActive?: MenuId;
  activeItem?: MenuId;
  logoSrc?: string;
  onNavigate?: (item: MenuItem) => void;
  onBooking?: () => void;
  bookingDisabled?: boolean;
  disabledItems?: MenuId[];
}

const menuItems: MenuItem[] = [
  { id: "home", label: "Trang chủ", href: "/" },
  { id: "explore", label: "Khám phá", href: "/kham-pha" },
  { id: "consign", label: "Cách ký gửi", href: "/cach-ky-gui" },
  { id: "login", label: "Đăng nhập", href: "/dang-nhap" },
];

export default function CusNavBar({
  initialActive = "home",
  activeItem,
  logoSrc = mascotLogo,
  onNavigate,
  onBooking,
  bookingDisabled = false,
  disabledItems = [],
}: CusNavBarProps) {
  const [internalActive, setInternalActive] = useState<MenuId>(initialActive);

  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileMenuId = useId();
  const currentActive = activeItem ?? internalActive;

  const handleNavigate = (
    event: MouseEvent<HTMLAnchorElement>,
    item: MenuItem,
  ): void => {
    const isDisabled = item.disabled || disabledItems.includes(item.id);

    if (isDisabled) {
      event.preventDefault();
      return;
    }

    if (onNavigate) {
      event.preventDefault();
      onNavigate(item);
    }

    if (activeItem === undefined) {
      setInternalActive(item.id);
    }

    setMobileOpen(false);
  };

  const renderMenuItem = (item: MenuItem, isMobile = false) => {
    const isActive = currentActive === item.id;
    const isDisabled = item.disabled || disabledItems.includes(item.id);

    return (
      <a
        key={item.id}
        href={isDisabled ? undefined : item.href}
        className={[
          isMobile ? "cus-mobile-item" : "cus-menu-item",
          isActive ? "is-active" : "",
          isDisabled ? "is-disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={isActive ? "page" : undefined}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={(event) => handleNavigate(event, item)}
      >
        {item.label}
      </a>
    );
  };

  return (
    <header className="cus-header">
      <nav className="cus-nav" aria-label="Điều hướng chính">
        {/* BRAND */}
        <a
          href="/"
          className="cus-brand"
          onClick={(event) => handleNavigate(event, menuItems[0])}
        >
          <span className="cus-logo-wrapper">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="cus-logo" />
            ) : (
              <span className="cus-logo-placeholder" aria-hidden="true">
                O
              </span>
            )}
          </span>

          <span className="cus-brand-name">OCS</span>
        </a>

        {/* DESKTOP MENU */}
        <div className="cus-menu">
          {menuItems.map((item) => renderMenuItem(item))}
        </div>

        {/* DESKTOP CTA */}
        <button
          type="button"
          className="cus-booking-btn cus-desktop-cta"
          disabled={bookingDisabled}
          onClick={onBooking}
        >
          <span>Đặt lịch ký gửi</span>
          <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
        </button>

        {/* MOBILE TOGGLE */}
        <button
          type="button"
          className="cus-mobile-toggle"
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
          aria-controls={mobileMenuId}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? (
            <X size={22} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Menu size={22} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div
        id={mobileMenuId}
        className={`cus-mobile-menu ${mobileOpen ? "is-open" : ""}`}
        inert={!mobileOpen}
      >
        {menuItems.map((item) => renderMenuItem(item, true))}

        <button
          type="button"
          className="cus-booking-btn cus-mobile-cta"
          disabled={bookingDisabled}
          onClick={() => {
            setMobileOpen(false);
            onBooking?.();
          }}
        >
          <span>Đặt lịch ký gửi</span>
          <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

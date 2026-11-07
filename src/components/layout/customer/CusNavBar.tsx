import { useState, useId, type MouseEvent } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import mascotLogo from "../../../assets/images/mascot-logo.png";

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
  { id: "explore", label: "Khám phá", href: "/catalog" },
  { id: "consign", label: "Cách ký gửi", href: "/consign" },
  { id: "login", label: "Đăng nhập", href: "/login" },
];

const bookingButtonClasses = "inline-flex h-[27px] w-[116px] basis-[116px] cursor-pointer items-center justify-center gap-[5px] rounded-full border-0 bg-brand-pink text-[8px] leading-none font-semibold text-brand-ink shadow-[0_4px_10px_color-mix(in_srgb,var(--color-brand-pink)_35%,transparent)] transition-[background-color,transform,box-shadow] duration-200 enabled:hover:-translate-y-px enabled:hover:bg-brand-pink-hover enabled:hover:shadow-[0_5px_12px_color-mix(in_srgb,var(--color-brand-pink)_45%,transparent)] enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";

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
          isMobile
            ? "rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-ink no-underline transition-colors duration-200"
            : "flex min-h-8 items-center rounded-md px-[5px] text-[8px] leading-[1.4] font-semibold whitespace-nowrap text-brand-ink no-underline transition-colors duration-200",
          isActive && isMobile ? "bg-brand-pink-surface" : "",
          isDisabled ? "pointer-events-none cursor-not-allowed opacity-40" : "hover:bg-brand-pink-surface hover:text-brand-highlight",
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
    <header className={`
      relative z-[100] w-full bg-surface-default font-sans text-brand-ink motion-reduce:[&_*]:transition-none
      motion-reduce:[&_*]:animate-none [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-[3px]
      [&_a:focus-visible]:outline-brand-pink-focus [&_button:focus-visible]:outline-2
      [&_button:focus-visible]:outline-offset-[3px] [&_button:focus-visible]:outline-brand-pink-focus
    `}>
      <nav className="flex min-h-[49px] w-full items-center px-[22px] max-md:justify-between max-md:px-4" aria-label="Điều hướng chính">
        {/* BRAND */}
        <a
          href="/"
          className="flex basis-[23%] items-center gap-[9px] text-brand-ink no-underline max-md:basis-auto"
          onClick={(event) => handleNavigate(event, menuItems[0])}
        >
          <span className="grid size-[18px] shrink-0 place-items-center overflow-hidden rounded-full bg-brand-pink-light">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="size-full object-contain" />
            ) : (
              <span className="text-[10px] leading-none font-bold text-brand-ink" aria-hidden="true">
                O
              </span>
            )}
          </span>

          <span className="text-base leading-none font-bold">OCS</span>
        </a>

        {/* DESKTOP MENU */}
        <div className="flex basis-[41%] items-center justify-between max-md:hidden">
          {menuItems.map((item) => renderMenuItem(item))}
        </div>

        {/* DESKTOP CTA */}
        <button
          type="button"
          className={`${bookingButtonClasses} ml-[6.5%] max-md:hidden`}
          disabled={bookingDisabled}
          onClick={onBooking}
        >
          <span>Đặt lịch ký gửi</span>
          <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
        </button>

        {/* MOBILE TOGGLE */}
        <button
          type="button"
          className="hidden size-[34px] cursor-pointer items-center justify-center rounded-lg border-0 bg-brand-pink-surface text-brand-ink max-md:flex"
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
        className={`invisible hidden max-h-0 flex-col gap-1 overflow-hidden px-4 opacity-0 transition-[max-height,opacity,padding,visibility] duration-200 max-md:flex ${mobileOpen ? "max-md:visible max-md:max-h-[360px] max-md:pt-2 max-md:pb-4 max-md:opacity-100 max-md:shadow-[0_8px_14px_color-mix(in_srgb,var(--color-brand-ink)_10%,transparent)]" : ""}`}
        inert={!mobileOpen}
      >
        {menuItems.map((item) => renderMenuItem(item, true))}

        <button
          type="button"
          className={`${bookingButtonClasses} mt-2 max-md:h-10 max-md:w-full max-md:basis-10 max-md:text-[13px]`}
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

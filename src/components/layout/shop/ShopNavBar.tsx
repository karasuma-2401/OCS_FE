import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import {
  Banknote,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ContactRound,
  FileText,
  Handshake,
  Home,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Store,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { screenPaths, type ShopNavId } from "@/auth/permissions";

export type { ShopNavId } from "@/auth/permissions";

export interface ShopNavItem {
  id: ShopNavId;
  label: string;
  href: string;
  disabled?: boolean;
}

export interface ShopNavBarProps {
  activeItem?: ShopNavId;
  initialActive?: ShopNavId;
  profileName?: string;
  onNavigate?: (item: ShopNavItem) => void;
  onBack?: () => void;
  onProfileClick?: () => void;
  onHome?: () => void;
  onLogout?: () => void;
  loggingOut?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  disabledItems?: ShopNavId[];
  showAccounts?: boolean;
  allowedItems?: ShopNavId[];
  actions?: React.ReactNode;
  showContractManagement?: boolean;
  contractsActive?: boolean;
  onContracts?: () => void;
}

const navigation: ShopNavItem[] = [
  { id: "pos", label: "POS Bán Hàng", href: screenPaths.pos },
  { id: "inventory", label: "Quản Lý Kho", href: screenPaths.inventory },
  {
    id: "consignment",
    label: "Tiếp Nhận Ký Gửi",
    href: screenPaths.consignment,
  },
  {
    id: "customers",
    label: "Khách Hàng",
    href: screenPaths.customers,
  },
  {
    id: "settlement",
    label: "Quyết Toán",
    href: screenPaths.settlement,
  },
  { id: "reports", label: "Báo Cáo", href: screenPaths.reports },
  { id: "settings", label: "Cấu Hình", href: screenPaths.settings },
  { id: "accounts", label: "Tài Khoản", href: screenPaths.accounts },
];

const navigationIcons: Record<ShopNavId, LucideIcon> = {
  pos: ShoppingCart,
  inventory: Package,
  consignment: Handshake,
  customers: UsersRound,
  settlement: Banknote,
  reports: BarChart3,
  settings: Settings,
  accounts: ContactRound,
};

export default function ShopNavBar({
  activeItem,
  initialActive = "pos",
  profileName = "Nguyễn Văn A",
  onNavigate,
  onProfileClick,
  onHome,
  onLogout,
  loggingOut = false,
  disabledItems = [],
  showAccounts = false,
  allowedItems,
  actions,
  showContractManagement = false,
  contractsActive = false,
  onContracts,
}: ShopNavBarProps) {
  const [selected, setSelected] = useState<ShopNavId>(initialActive);
  const [accountOpen, setAccountOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();

  useEffect(() => {
    if (!accountOpen) return;
    const handleOutside = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node))
        setAccountOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountOpen]);

  const currentActive = activeItem ?? selected;

  useEffect(() => {
    const navigationElement = navigationRef.current;
    const activeLink = navigationElement?.querySelector<HTMLElement>(
      'a[aria-current="page"]',
    );
    if (!navigationElement || !activeLink) return;
    const container = navigationElement.getBoundingClientRect();
    const active = activeLink.getBoundingClientRect();
    if (active.top < container.top)
      navigationElement.scrollTop += active.top - container.top;
    else if (active.bottom > container.bottom)
      navigationElement.scrollTop += active.bottom - container.bottom;
  }, [currentActive, showAccounts, contractsActive, allowedItems?.join("|")]);

  const handleSelect = (
    event: MouseEvent<HTMLAnchorElement>,
    item: ShopNavItem,
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
      setSelected(item.id);
    }
  };

  return (
    <header
      className={`
      relative z-[100] w-full rounded-card border border-brand-pink-light bg-surface-default font-sans shadow-sm
      transition-[width] duration-200 lg:sticky lg:top-3 lg:h-[calc(100vh-24px)] lg:shrink-0
      ${collapsed ? "lg:w-16" : "lg:w-64"} [&_a:focus-visible]:outline-2
      [&_a:focus-visible]:outline-offset-[-2px] [&_a:focus-visible]:outline-brand-pink-focus
      [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2
      [&_button:focus-visible]:outline-brand-pink-focus
    `}
    >
      <button
        type="button"
        className="absolute -right-3 top-14 z-10 hidden size-7 cursor-pointer items-center justify-center rounded-full border border-brand-pink-light bg-surface-default text-text-secondary shadow-sm transition-colors hover:bg-brand-pink-surface hover:text-brand-highlight lg:flex"
        aria-label={
          collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"
        }
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        {collapsed ? (
          <ChevronRight size={16} aria-hidden="true" />
        ) : (
          <ChevronLeft size={16} aria-hidden="true" />
        )}
      </button>

      <div
        className={`flex min-h-[68px] flex-col gap-4 p-4 transition-[padding] lg:h-full lg:gap-5 ${collapsed ? "lg:items-center lg:px-2" : ""}`}
      >
        <div
          className={`flex shrink-0 items-center gap-3 whitespace-nowrap text-brand-ink ${collapsed ? "lg:justify-center" : ""}`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight">
            <Store size={20} aria-hidden="true" />
          </span>
          <strong
            className={`text-lg leading-none font-bold ${collapsed ? "lg:hidden" : ""}`}
          >
            OCS
          </strong>
        </div>

        <nav
          ref={navigationRef}
          className={`
          flex min-w-0 flex-col items-stretch gap-1 overflow-y-auto py-1 [scrollbar-width:thin]
          ${collapsed ? "lg:w-full" : ""}
        `}
          aria-label="Điều hướng cửa hàng"
        >
          {navigation
            .filter(
              (item) =>
                (item.id !== "accounts" || showAccounts) &&
                (!allowedItems || allowedItems.includes(item.id)),
            )
            .map((item) => {
              const isActive = !contractsActive && currentActive === item.id;
              const isDisabled =
                item.disabled || disabledItems.includes(item.id);
              const Icon = navigationIcons[item.id];

              return (
                <a
                  key={item.id}
                  href={isDisabled ? undefined : item.href}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "flex min-h-10 w-full shrink-0 cursor-pointer items-center justify-start gap-3 rounded-control px-3 text-left text-sm leading-5 font-medium text-text-secondary no-underline transition-colors duration-200",
                    collapsed ? "lg:justify-center lg:px-0" : "",
                    isActive
                      ? "bg-brand-pink-light !font-semibold !text-brand-highlight"
                      : "",
                    isDisabled
                      ? "pointer-events-none cursor-not-allowed opacity-40"
                      : "hover:bg-brand-pink-surface hover:text-brand-highlight",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={isActive ? "page" : undefined}
                  aria-disabled={isDisabled || undefined}
                  tabIndex={isDisabled ? -1 : undefined}
                  onClick={(event) => handleSelect(event, item)}
                >
                  <Icon size={18} className="shrink-0" aria-hidden="true" />
                  <span className={collapsed ? "lg:hidden" : ""}>
                    {item.label}
                  </span>
                </a>
              );
            })}
          {showContractManagement && <a href="/shop/contracts" title={collapsed ? 'Hợp đồng' : undefined}
            aria-current={contractsActive ? 'page' : undefined} onClick={event => { if (onContracts) { event.preventDefault(); onContracts(); } }}
            className={`flex min-h-10 w-full shrink-0 items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-text-secondary no-underline transition-colors hover:bg-brand-pink-surface hover:text-brand-highlight ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${contractsActive ? 'bg-brand-pink-light !font-semibold !text-brand-highlight' : ''}`}>
            <FileText size={18} className="shrink-0" aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>Hợp đồng</span>
          </a>}
        </nav>

        <div
          className={`mt-auto flex shrink-0 flex-col items-stretch gap-2.5 ${collapsed ? "lg:w-full" : ""}`}
        >
          {actions}
          <div className="border-t border-brand-pink-light pt-3">
            <div
              className="relative"
              ref={accountRef}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                )
                  setAccountOpen(false);
              }}
            >
              <button
                ref={accountButtonRef}
                type="button"
                className={`
              inline-flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-control border border-brand-pink-light bg-white
              px-3 py-2 text-left text-text-secondary transition-colors hover:border-brand-pink-focus hover:bg-brand-pink-surface
              aria-expanded:border-brand-pink-focus aria-expanded:bg-brand-pink-surface
              ${collapsed ? "lg:justify-center lg:px-0" : ""}
            `}
                aria-label={`Tài khoản ${profileName}`}
                aria-expanded={accountOpen}
                aria-controls={accountMenuId}
                onClick={() => setAccountOpen((open) => !open)}
              >
                <CircleUserRound size={19} aria-hidden="true" />
                <span
                  className={`max-w-[130px] truncate text-[.85rem] leading-[1.2] font-semibold max-xs:max-w-[92px] ${collapsed ? "lg:hidden" : ""}`}
                >
                  {profileName}
                </span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`ml-auto transition-transform duration-200 ${accountOpen ? "rotate-180" : ""} ${collapsed ? "lg:hidden" : ""}`}
                />
              </button>
              {accountOpen && (
                <div
                  id={accountMenuId}
                  className={`
              absolute bottom-0 left-[calc(100%+.5rem)] right-auto top-auto z-[110] w-[210px] rounded-xl border border-[#eee6e9] bg-white
              p-[.4rem] shadow-[0_12px_32px_rgba(56,37,48,.13)] [&_button]:flex [&_button]:w-full
              [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-[.7rem] [&_button]:rounded-lg
              [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-[.8rem] [&_button]:text-left
              [&_button]:text-[.8rem] [&_button]:font-semibold [&_button]:text-[#514b54] [&_button:hover]:bg-[#fbf3f6]
              [&_button:hover]:text-[#ae6580] [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-60
            `}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      onProfileClick?.();
                    }}
                  >
                    <CircleUserRound size={17} aria-hidden="true" /> Hồ sơ cá
                    nhân
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      onHome?.();
                    }}
                  >
                    <Home size={17} aria-hidden="true" /> Về trang chủ
                  </button>
                  <button
                    type="button"
                    className="!rounded-t-none !border-t !border-[#f0eaed]"
                    onClick={onLogout}
                    disabled={loggingOut}
                  >
                    <LogOut size={17} aria-hidden="true" />{" "}
                    {loggingOut ? "Đang thoát..." : "Đăng xuất"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

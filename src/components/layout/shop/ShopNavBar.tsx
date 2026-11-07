import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { ChevronDown, CircleUserRound, Home, LogOut } from "lucide-react";
import type { ShopNavId } from "@/auth/permissions";
import mascotLogo from "../../../assets/images/mascot-logo.png";

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
}

const navigation: ShopNavItem[] = [
  { id: "pos", label: "POS Bán Hàng", href: "/shop/pos" },
  { id: "inventory", label: "Quản Lý Kho", href: "/shop/kho" },
  {
    id: "consignment",
    label: "Tiếp Nhận Ký Gửi",
    href: "/shop/ky-gui",
  },
  {
    id: "customers",
    label: "Khách Hàng",
    href: "/shop/khach-hang",
  },
  {
    id: "settlement",
    label: "Quyết Toán",
    href: "/shop/quyet-toan",
  },
  { id: "reports", label: "Báo Cáo", href: "/shop/bao-cao" },
  { id: "settings", label: "Cấu Hình", href: "/shop/cau-hinh" },
  { id: "accounts", label: "Tài Khoản", href: "/admin/accounts" },
];

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
}: ShopNavBarProps) {
  const [selected, setSelected] = useState<ShopNavId>(initialActive);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();

  useEffect(() => {
    if (!accountOpen) return;
    const handleOutside = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [accountOpen]);

  const currentActive = activeItem ?? selected;

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
    <header className={`
      relative z-[100] mx-[5px] mt-2 min-h-14 w-[calc(100%-10px)] rounded-[10px] border border-[#efd7e0]
      bg-[#f9e9ef] font-sans shadow-navbar after:absolute after:inset-x-0 after:bottom-0 after:h-0.5
      after:rounded-b-[10px] after:bg-[#e9b8ca] after:content-[''] [&_a:focus-visible]:outline-2
      [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-brand-pink
      [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2
      [&_button:focus-visible]:outline-brand-pink
    `}>
      <div className="flex min-h-[54px] items-center gap-2 px-3 max-md:flex-wrap max-md:py-2 max-xs:px-2">
        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-text-primary">
          <img src={mascotLogo} alt="" className="size-6 object-contain" />
          <strong className="text-[13px] leading-none font-bold tracking-[-.25px]">OCS Vintage</strong>
        </div>

        <nav className={`
          ml-1 flex min-w-0 flex-auto items-center justify-evenly gap-0.5 overflow-x-auto [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden max-md:order-4 max-md:ml-0 max-md:basis-full max-md:justify-start
        `} aria-label="Điều hướng cửa hàng">
          {navigation.filter((item) => (item.id !== 'accounts' || showAccounts) && (!allowedItems || allowedItems.includes(item.id))).map((item) => {
            const isActive = currentActive === item.id;
            const isDisabled = item.disabled || disabledItems.includes(item.id);

            return (
              <a
                key={item.id}
                href={isDisabled ? undefined : item.href}
                className={[
                  "flex min-h-8 shrink-0 cursor-pointer items-center justify-center rounded-md px-2.5 text-[10px] leading-[1.2] font-medium whitespace-nowrap text-text-secondary no-underline transition-[background,color,transform] duration-200 max-xs:px-2 max-xs:text-[9px]",
                  isActive ? "bg-[#edcad8] !font-bold text-[#793852]" : "",
                  isDisabled ? "pointer-events-none cursor-not-allowed opacity-40" : "hover:bg-[#f1d4df] hover:text-[#813d5a] active:scale-[0.97]",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isActive ? "page" : undefined}
                aria-disabled={isDisabled || undefined}
                tabIndex={isDisabled ? -1 : undefined}
                onClick={(event) => handleSelect(event, item)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          {actions}
          <div className="relative" ref={accountRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAccountOpen(false); }}>
            <button ref={accountButtonRef} type="button" className={`
              inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-[#eee6e9] bg-white
              px-[.65rem] py-2 text-[#514b54] hover:border-[#ead2dc] hover:bg-[#fbf3f6] aria-expanded:border-[#ead2dc]
              aria-expanded:bg-[#fbf3f6]
            `} aria-label={`Tài khoản ${profileName}`} aria-expanded={accountOpen} aria-controls={accountMenuId} onClick={() => setAccountOpen((open) => !open)}>
              <CircleUserRound size={19} aria-hidden="true" />
              <span className="max-w-[130px] truncate text-[.78rem] leading-[1.2] font-semibold max-xs:max-w-[92px]">{profileName}</span>
              <ChevronDown size={15} aria-hidden="true" className={`transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`} />
            </button>
            {accountOpen && <div id={accountMenuId} className={`
              absolute top-[calc(100%+.55rem)] right-0 z-[110] w-[210px] rounded-xl border border-[#eee6e9] bg-white
              p-[.4rem] shadow-[0_12px_32px_rgba(56,37,48,.13)] [&_button]:flex [&_button]:w-full
              [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-[.7rem] [&_button]:rounded-lg
              [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-[.8rem] [&_button]:text-left
              [&_button]:text-[.8rem] [&_button]:font-semibold [&_button]:text-[#514b54] [&_button:hover]:bg-[#fbf3f6]
              [&_button:hover]:text-[#ae6580] [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-60
            `}>
              <button type="button" onClick={() => { setAccountOpen(false); onProfileClick?.(); }}><CircleUserRound size={17} aria-hidden="true" /> Hồ sơ cá nhân</button>
              <button type="button" onClick={() => { setAccountOpen(false); onHome?.(); }}><Home size={17} aria-hidden="true" /> Về trang chủ</button>
              <button type="button" className="!rounded-t-none !border-t !border-[#f0eaed]" onClick={onLogout} disabled={loggingOut}><LogOut size={17} aria-hidden="true" /> {loggingOut ? 'Đang thoát...' : 'Đăng xuất'}</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
}

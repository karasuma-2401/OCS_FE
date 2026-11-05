import { useState, type MouseEvent } from "react";
import { UserRound } from "lucide-react";
import mascotLogo from "../../../assets/images/mascot-logo.png";
import "./ShopNavBar.css";

export type ShopNavId =
  | "pos"
  | "inventory"
  | "consignment"
  | "customers"
  | "settlement"
  | "reports"
  | "settings"
  | "accounts";

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
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  disabledItems?: ShopNavId[];
  showAccounts?: boolean;
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
  disabledItems = [],
  showAccounts = false,
  actions,
}: ShopNavBarProps) {
  const [selected, setSelected] = useState<ShopNavId>(initialActive);

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
    <header className="shop-navbar">
      <div className="shop-navbar__inner">
        <div className="shop-navbar__brand">
          <img src={mascotLogo} alt="" className="shop-navbar__brand-logo" />
          <strong>OCS Vintage</strong>
        </div>

        <nav className="shop-navbar__menu" aria-label="Điều hướng cửa hàng">
          {navigation.filter((item) => item.id !== 'accounts' || showAccounts).map((item) => {
            const isActive = currentActive === item.id;
            const isDisabled = item.disabled || disabledItems.includes(item.id);

            return (
              <a
                key={item.id}
                href={isDisabled ? undefined : item.href}
                className={[
                  "shop-navbar__item",
                  isActive ? "is-active" : "",
                  isDisabled ? "is-disabled" : "",
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

        <div className="shop-navbar__actions">
          {actions}
          <button
            type="button"
            className="shop-navbar__profile"
            aria-label={`Tài khoản ${profileName}`}
            onClick={onProfileClick}
          >
            <span className="shop-navbar__profile-icon" aria-hidden="true">
              <UserRound size={13} strokeWidth={2} />
            </span>
            <span className="shop-navbar__profile-name">{profileName}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

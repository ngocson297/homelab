import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLoginForm } from "@/components/admin-login-form";
import { AdminLogoutButton } from "@/components/admin-logout-button";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

beforeEach(() => { navigation.replace.mockReset(); navigation.refresh.mockReset(); localStorage.clear(); sessionStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

describe("staff admin authentication", () => {
  it("renders accessible validation and password visibility", async () => {
    render(<AdminLoginForm />); const user = userEvent.setup();
    const password = screen.getByLabelText("Mật khẩu"); expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" })); expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByText("Email không hợp lệ.")).toBeVisible(); expect(screen.getByText(/Mật khẩu phải có ít nhất 10/)).toBeVisible();
  });

  it("logs in once with credentials include and stores no auth data", async () => {
    let resolveFetch: (value: Response) => void = () => undefined;
    const fetchMock = vi.fn<typeof fetch>(() => new Promise((resolve) => { resolveFetch = resolve; })); vi.stubGlobal("fetch", fetchMock);
    render(<AdminLoginForm />); const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), " ADMIN@HOMELAB.LOCAL "); await user.type(screen.getByLabelText("Mật khẩu"), "Synthetic1234");
    await user.dblClick(screen.getByRole("button", { name: "Đăng nhập" })); expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? []; expect(init?.credentials).toBe("include");
    resolveFetch(json({ user: { email: "admin@homelab.local", fullName: "Synthetic Admin", role: "ADMIN" } }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/admin"));
    expect(localStorage).toHaveLength(0); expect(sessionStorage).toHaveLength(0);
  });

  it.each([
    ["credentials", "Thông tin đăng nhập không hợp lệ."],
    ["network", "Không thể kết nối tới hệ thống."],
  ])("shows a friendly %s error", async (kind, message) => {
    vi.stubGlobal("fetch", vi.fn(() => kind === "network" ? Promise.reject(new TypeError("network")) : Promise.resolve(json({}, 401))));
    render(<AdminLoginForm />); const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "admin@homelab.local"); await user.type(screen.getByLabelText("Mật khẩu"), "Synthetic1234"); await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message); expect(screen.queryByText(/stack/i)).not.toBeInTheDocument();
  });

  it("logs out with credentials and redirects", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 204 }))); vi.stubGlobal("fetch", fetchMock);
    render(<AdminLogoutButton />); await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/admin/login")); expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe("include");
  });
});

function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }); }

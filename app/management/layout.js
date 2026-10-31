import { AuthProvider } from "./auth-provider";

export default function ManagementLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

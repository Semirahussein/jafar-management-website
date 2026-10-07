import ManagerShell from "./manager-shell";
import "./manager.css";

export default function ManagerLayout({ children }) {
  return <ManagerShell>{children}</ManagerShell>;
}

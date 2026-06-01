import { RouterProvider } from "react-router";
import { router } from "./routes/routes";
import { AuthProvider } from "./providers/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

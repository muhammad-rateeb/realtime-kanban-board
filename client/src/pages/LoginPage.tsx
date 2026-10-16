import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Log in to your boards."
      submitLabel="Log in"
      onSubmit={async ({ email, password }) => {
        await login(email, password);
        navigate("/", { replace: true });
      }}
      footer={
        <>
          No account yet?{" "}
          <Link to="/register" className="font-medium text-sky-600 hover:text-sky-700">
            Register
          </Link>
        </>
      }
    />
  );
}

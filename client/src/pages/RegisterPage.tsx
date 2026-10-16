import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Create your account"
      subtitle="Free, and it takes ten seconds."
      submitLabel="Register"
      showName
      onSubmit={async ({ name, email, password }) => {
        await register(name, email, password);
        navigate("/", { replace: true });
      }}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-sky-600 hover:text-sky-700">
            Log in
          </Link>
        </>
      }
    />
  );
}

import { SignIn } from "@clerk/clerk-react";
import "./signinPage.css";
import { useDocumentTitle } from "../../lib/hooks";

const SigninPage = () => {
  useDocumentTitle("Sign in");
  return (
    <div className="signinPage">
      <SignIn path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </div>
  );
};

export default SigninPage;

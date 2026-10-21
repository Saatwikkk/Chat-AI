import { SignUp } from "@clerk/clerk-react";
import "./signupPage.css";
import { useDocumentTitle } from "../../lib/hooks";

const SignupPage = () => {
  useDocumentTitle("Sign up");
  return (
    <div className="signupPage">
      <SignUp path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
    </div>
  );
};

export default SignupPage;

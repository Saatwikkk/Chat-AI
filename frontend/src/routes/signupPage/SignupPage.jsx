import { SignUp } from "@clerk/clerk-react";
import "./signupPage.css"

const SignupPage = () => {
    return (
        <div className="signupPage"><SignUp path="/sign-up" /></div>
    );
}

export default SignupPage;
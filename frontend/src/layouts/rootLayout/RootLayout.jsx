import { Link, Outlet, useNavigate } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./rootLayout.css";
import { CLERK_PUBLISHABLE_KEY } from "../../lib/config";
import { DialogProvider } from "../../components/dialogs/DialogProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry requests that failed for a reason retrying won't fix.
      retry: (failureCount, error) =>
        ![400, 401, 403, 404].includes(error?.status) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

const RootLayout = () => {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <DialogProvider>
          <div className="rootLayout">
            <a href="#main" className="skipLink">
              Skip to main content
            </a>
            <header>
              <Link to="/" className="logo" aria-label="CHAT AI home">
                <img src="/logo.png" alt="" />
                <span>CHAT AI</span>
              </Link>
              <div className="user">
                <SignedIn>
                  <UserButton />
                </SignedIn>
                <SignedOut>
                  <Link to="/sign-in" className="signInLink">
                    Sign in
                  </Link>
                </SignedOut>
              </div>
            </header>
            <main id="main" tabIndex={-1}>
              <Outlet />
            </main>
          </div>
        </DialogProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

export default RootLayout;

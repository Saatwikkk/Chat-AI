import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./index.css";
import RootLayout from "./layouts/rootLayout/RootLayout";
import DashboardLayout from "./layouts/dashboardLayout/DashboardLayout";
import Homepage from "./routes/homePage/HomePage";
import DashboardPage from "./routes/dashBoardPage/DashBoardPage";
import SigninPage from "./routes/signinPage/SigninPage";
import SignupPage from "./routes/signupPage/SignupPage";
import NotFoundPage from "./routes/notFoundPage/NotFoundPage";

// The chat page pulls in Markdown rendering and syntax highlighting, so it's
// loaded on demand along with the other secondary pages.
const ChatPage = lazy(() => import("./routes/chatPage/ChatPage"));
const ContactPage = lazy(() => import("./routes/contactPage/ContactPage"));
const ExplorePage = lazy(() => import("./routes/explorePage/ExplorePage"));

const withSuspense = (element) => (
  <Suspense fallback={<div className="pageStatus">Loading…</div>}>{element}</Suspense>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { path: "/", element: <Homepage /> },
      { path: "/sign-in/*", element: <SigninPage /> },
      { path: "/sign-up/*", element: <SignupPage /> },
      { path: "/contact", element: withSuspense(<ContactPage />) },
      { path: "/explore", element: withSuspense(<ExplorePage />) },
      {
        element: <DashboardLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/dashboard/chats/:id", element: withSuspense(<ChatPage />) },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

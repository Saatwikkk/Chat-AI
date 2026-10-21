import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { useDocumentTitle } from "../../lib/hooks";

// Used both for unknown URLs and as the router's error boundary.
const NotFoundPage = () => {
  const error = useRouteError();
  const isNotFound = !error || (isRouteErrorResponse(error) && error.status === 404);
  useDocumentTitle(isNotFound ? "Page not found" : "Error");

  if (error && !isNotFound) console.error(error);

  return (
    <div className="pageStatus fullPage">
      <h1>{isNotFound ? "Page not found" : "Something went wrong"}</h1>
      <p>
        {isNotFound
          ? "The page you're looking for doesn't exist."
          : "An unexpected error occurred. Please try again."}
      </p>
      <Link to="/">Go home</Link>
    </div>
  );
};

export default NotFoundPage;

import { Navigate } from "react-router-dom";

const Index = () => {
  // Redirect to login or dashboard
  return <Navigate to="/login" replace />;
};

export default Index;

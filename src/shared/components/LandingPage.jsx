import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default LandingPage;
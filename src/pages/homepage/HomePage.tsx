import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  return (
    <section>
      <h1 className="text-heading">Dev Launcher</h1>
    </section>
  );
};

export default HomePage;

import { Navigate } from 'react-router-dom';
import SeoHead from '../components/SeoHead';

const Home = () => {
  return (
    <>
      <SeoHead
        title="BI Community"
        description="Форум про BI, DWH и аналитику данных"
        canonical="/"
      />
      <Navigate to="/board" replace />
    </>
  );
};

export default Home;

import PhoneFrame from './components/PhoneFrame/PhoneFrame';
import DashboardHeader from './components/DashboardHeader/DashboardHeader';
import DashboardCarousel from './components/DashboardCarousel/DashboardCarousel';
import SidekickSection from './components/SidekickSection/SidekickSection';
import TasksSection from './components/TasksSection/TasksSection';
import './styles/global.css';

export default function App() {
  return (
    <PhoneFrame>
      <DashboardHeader />
      <DashboardCarousel />
      <SidekickSection />
      <TasksSection />
      <div style={{ height: '20px' }} />
    </PhoneFrame>
  );
}

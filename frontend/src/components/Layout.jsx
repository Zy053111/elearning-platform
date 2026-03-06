import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50"> 
      <Navbar />
      
      {/* This is where the actual page content (like Dashboard or Login) goes */}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        <Outlet /> 
      </main>

      <Footer />
    </div>
  );
}
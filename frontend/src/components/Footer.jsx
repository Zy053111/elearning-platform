export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-gray-300 py-6 text-center text-sm w-full mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <p>&copy; {currentYear} eLearnPlatform. All rights reserved.</p>
      </div>
    </footer>
  );
}
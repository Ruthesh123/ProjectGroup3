export const ResponsiveTest = () => {
  return (
    <div className="p-4">
      <div className="sm:hidden">Mobile View (&lt; 640px)</div>
      <div className="hidden sm:block md:hidden">Tablet View (640px - 768px)</div>
      <div className="hidden md:block lg:hidden">Small Desktop (768px - 1024px)</div>
      <div className="hidden lg:block">Large Desktop (&gt; 1024px)</div>
    </div>
  );
};
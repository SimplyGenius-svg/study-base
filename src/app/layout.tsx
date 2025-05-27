import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* TEST: This should be big, bold, and red if Tailwind is working */}
        <div className="text-4xl font-bold text-red-500 bg-yellow-100 p-8">TAILWIND TEST</div>
        {children}
      </body>
    </html>
  );
}

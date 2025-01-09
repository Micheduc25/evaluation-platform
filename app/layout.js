"use client";

import "./globals.css";
import { Providers } from "./providers";
import AuthInitializer from "./AuthInitializer";
import { AuthProvider } from "@/components/providers/auth-provider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteGuard from "@/components/RouteGuard";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "@/store/store";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <Providers>
          <AuthProvider>
            <AuthInitializer>
              <RouteGuard>
                <Provider store={store}>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-grow">{children}</main>
                    <Footer />
                  </div>
                  <Toaster position="top-right" />
                </Provider>
              </RouteGuard>
            </AuthInitializer>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

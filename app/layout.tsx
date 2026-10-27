import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'بلوریان | سیستم قیمت آسانسور',description:'نرم افزار آفلاین لیست قیمت آسانسور'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body>{children}</body></html>}

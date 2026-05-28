/** Sets `html[data-shell=native]` before paint in Capacitor so CSS can swap desktop vs mobile chrome. */
export function ShellModeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var n=/Capacitor/i.test(navigator.userAgent)||(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());if(n)document.documentElement.setAttribute("data-shell","native")}catch(e){}})();`,
      }}
    />
  );
}

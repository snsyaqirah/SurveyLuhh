export default function ApartmentSVG() {
  return (
    <svg
      viewBox="0 0 460 290"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B5CFF0" />
          <stop offset="55%" stopColor="#D5E8F8" />
          <stop offset="100%" stopColor="#EDF5FD" />
        </linearGradient>
        <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7DC46B" />
          <stop offset="100%" stopColor="#569038" />
        </linearGradient>
        <linearGradient id="gBldMain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3E5E90" />
          <stop offset="100%" stopColor="#2E4878" />
        </linearGradient>
        <linearGradient id="gWin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5CEF2" />
          <stop offset="100%" stopColor="#C2E0F8" />
        </linearGradient>
        <linearGradient id="gLobby" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#88C4EE" />
          <stop offset="100%" stopColor="#B8DCF8" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="460" height="290" fill="url(#gSky)" />

      {/* Clouds */}
      <g opacity="0.82">
        <ellipse cx="82" cy="48" rx="30" ry="15" fill="white" />
        <ellipse cx="60" cy="54" rx="20" ry="12" fill="white" />
        <ellipse cx="106" cy="53" rx="19" ry="12" fill="white" />
      </g>
      <g opacity="0.62">
        <ellipse cx="372" cy="37" rx="26" ry="13" fill="white" />
        <ellipse cx="352" cy="43" rx="17" ry="10" fill="white" />
        <ellipse cx="393" cy="42" rx="16" ry="10" fill="white" />
      </g>

      {/* ── Far background buildings ── */}
      {/* Far left */}
      <rect x="22" y="140" width="48" height="97" fill="#88A4C2" rx="2" />
      <g fill="#9BBAD6">
        {[148, 165, 182, 199, 216].map(y => (
          <g key={y}>
            <rect x="29" y={y} width="13" height="10" rx="1" />
            <rect x="47" y={y} width="13" height="10" rx="1" />
          </g>
        ))}
      </g>
      {/* Far right */}
      <rect x="390" y="148" width="50" height="89" fill="#88A4C2" rx="2" />
      <g fill="#9BBAD6">
        {[156, 173, 190, 207, 218].map(y => (
          <g key={y}>
            <rect x="397" y={y} width="13" height="9" rx="1" />
            <rect x="415" y={y} width="13" height="9" rx="1" />
          </g>
        ))}
      </g>

      {/* ── Medium flanking buildings ── */}
      {/* Medium left */}
      <rect x="82" y="92" width="60" height="145" fill="#94B0CC" rx="2" />
      <g fill="#A8C4DC">
        {[100, 118, 136, 154, 172, 190, 208].map(y => (
          <g key={y}>
            <rect x="89" y={y} width="14" height="11" rx="1" />
            <rect x="108" y={y} width="14" height="11" rx="1" />
          </g>
        ))}
      </g>
      {/* Medium right */}
      <rect x="318" y="97" width="60" height="140" fill="#94B0CC" rx="2" />
      <g fill="#A8C4DC">
        {[105, 123, 141, 159, 177, 195, 213].map(y => (
          <g key={y}>
            <rect x="325" y={y} width="14" height="11" rx="1" />
            <rect x="344" y={y} width="14" height="11" rx="1" />
          </g>
        ))}
      </g>

      {/* ── MAIN BUILDING ── */}
      {/* Drop shadow */}
      <rect x="157" y="34" width="154" height="208" rx="4" fill="#1A3060" opacity="0.13" />

      {/* Building body — x=153 to x=307 (154px wide), y=30 to y=240 */}
      <rect x="153" y="30" width="154" height="210" rx="4" fill="url(#gBldMain)" />

      {/* Floor separator lines (6 regular floors, pitch = 25px) */}
      <g stroke="#243C6A" strokeWidth="1" opacity="0.55">
        {[55, 80, 105, 130, 155, 180, 190].map(y => (
          <line key={y} x1="153" y1={y} x2="307" y2={y} />
        ))}
      </g>

      {/* Centre structural column */}
      <rect x="228" y="30" width="4" height="162" fill="#243C6A" opacity="0.28" />

      {/* Windows — left column x=165 w=55, right column x=240 w=55 */}
      {/* y values per floor: 34, 59, 84, 109, 134, 159  (floor pitch 25px, window top at floor_start+4) */}
      <g fill="url(#gWin)">
        {[34, 59, 84, 109, 134, 159].map(y => (
          <g key={y}>
            <rect x="165" y={y} width="55" height="17" rx="2" />
            <rect x="240" y={y} width="55" height="17" rx="2" />
          </g>
        ))}
      </g>

      {/* Window shine highlights */}
      <g fill="white" opacity="0.22">
        {[34, 59, 84, 109, 134, 159].map(y => (
          <g key={y}>
            <rect x="165" y={y} width="22" height="5" rx="1" />
            <rect x="240" y={y} width="22" height="5" rx="1" />
          </g>
        ))}
      </g>

      {/* ── Lobby (y=190 to y=240) ── */}
      {/* Side panels */}
      <rect x="153" y="190" width="40" height="50" fill="#2C4878" />
      <rect x="267" y="190" width="40" height="50" fill="#2C4878" />
      {/* Side lobby windows */}
      <rect x="160" y="198" width="25" height="18" fill="url(#gWin)" rx="2" opacity="0.75" />
      <rect x="274" y="198" width="25" height="18" fill="url(#gWin)" rx="2" opacity="0.75" />
      {/* Main glass entrance */}
      <rect x="193" y="188" width="74" height="52" rx="2" fill="url(#gLobby)" />
      {/* Door frame divisions */}
      <line x1="230" y1="188" x2="230" y2="240" stroke="#4A80B0" strokeWidth="1.5" />
      <line x1="193" y1="207" x2="267" y2="207" stroke="#4A80B0" strokeWidth="1" />
      {/* Door handles */}
      <circle cx="221" cy="220" r="2.5" fill="#5A9AC8" />
      <circle cx="239" cy="220" r="2.5" fill="#5A9AC8" />

      {/* ── Rooftop ── */}
      <rect x="151" y="22" width="158" height="12" rx="3" fill="#273F6A" />
      <rect x="151" y="22" width="158" height="3" rx="2" fill="#365490" />
      {/* Rooftop structures */}
      <rect x="210" y="12" width="9" height="12" rx="1" fill="#273F6A" />
      <rect x="239" y="14" width="7" height="10" rx="1" fill="#273F6A" />
      <rect x="264" y="13" width="9" height="11" rx="1" fill="#273F6A" />
      {/* Antennae */}
      <line x1="214" y1="12" x2="214" y2="4" stroke="#3A5282" strokeWidth="1.5" />
      <circle cx="214" cy="3.5" r="2" fill="#5A7AA8" />
      <line x1="243" y1="14" x2="243" y2="5" stroke="#3A5282" strokeWidth="1.5" />
      <circle cx="243" cy="4.5" r="2" fill="#5A7AA8" />

      {/* ── Ground ── */}
      <rect x="0" y="237" width="460" height="53" fill="url(#gGround)" />
      {/* Sidewalk */}
      <rect x="0" y="237" width="460" height="11" fill="#CEC8BC" />
      {/* Path to building */}
      <rect x="200" y="240" width="60" height="8" fill="#C0B9B0" />

      {/* ── Trees ── */}
      {/* Left tree */}
      <rect x="110" y="200" width="9" height="40" rx="3" fill="#5C3A1E" />
      <circle cx="114.5" cy="182" r="26" fill="#48883A" />
      <circle cx="102" cy="193" r="17" fill="#579844" />
      <circle cx="127" cy="191" r="19" fill="#38782E" />
      {/* Right tree */}
      <rect x="341" y="202" width="9" height="38" rx="3" fill="#5C3A1E" />
      <circle cx="345.5" cy="185" r="24" fill="#48883A" />
      <circle cx="333" cy="195" r="16" fill="#579844" />
      <circle cx="358" cy="193" r="18" fill="#38782E" />

      {/* Base bushes */}
      <circle cx="145" cy="238" r="9" fill="#489840" />
      <circle cx="134" cy="241" r="7" fill="#387830" />
      <circle cx="157" cy="240" r="7" fill="#589848" />
      <circle cx="315" cy="238" r="9" fill="#489840" />
      <circle cx="326" cy="241" r="7" fill="#387830" />
      <circle cx="304" cy="240" r="7" fill="#589848" />
    </svg>
  );
}

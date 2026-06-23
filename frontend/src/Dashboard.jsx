import { useEffect, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"

const API = "http://localhost:8000"
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [byGarda, setByGarda] = useState([])
  const [mapData, setMapData] = useState([])
  const [controls, setControls] = useState([])

  useEffect(() => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`
    }

    fetch(`${API}/controls/stats/summary`, { headers })
      .then(res => res.json())
      .then(setSummary)

    fetch(`${API}/controls/stats/by-garda`, { headers })
      .then(res => res.json())
      .then(setByGarda)

    fetch(`${API}/controls/map`, { headers })
      .then(res => res.json())
      .then(setMapData)

    fetch(`${API}/controls/paginated`, { headers })
      .then(res => res.json())
      .then(data => setControls(data.items || []))

  }, [])

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Dashboard GFN</h1>

      {/* CARDURI */}
      {summary && (
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <Card title="Total" value={summary.total_controale} />
          <Card title="Conforme" value={summary.conforme} />
          <Card title="Neconforme" value={summary.neconforme} />
          <Card title="Amenzi" value={summary.amenzi_total} />
          <Card title="Prejudiciu" value={summary.prejudiciu_total} />
        </div>
      )}

      {/* GRAFIC */}
      <h2>Controale pe garda</h2>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={byGarda}>
            <XAxis dataKey="garda" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* HARTA */}
      <h2 style={{ marginTop: 30 }}>Harta controale</h2>
      <MapContainer center={[45.7, 24.9]} zoom={6} style={{ height: 400 }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapData.map(c => (
          <Marker key={c.id} position={[c.lat, c.lon]}>
            <Popup>
              <strong>{c.entitate_controlata}</strong><br />
              {c.judet} - {c.garda}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* LISTA */}
      <h2 style={{ marginTop: 30 }}>Controale</h2>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>ID</th>
            <th>Data</th>
            <th>Judet</th>
            <th>Garda</th>
            <th>Entitate</th>
          </tr>
        </thead>
        <tbody>
          {controls.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.payload?.data_control}</td>
              <td>{c.payload?.judet}</td>
              <td>{c.payload?.garda}</td>
              <td>{c.payload?.entitate_controlata}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Card({ title, value }) {
  return (
    <div style={{
      border: "1px solid #ccc",
      padding: 20,
      borderRadius: 10,
      minWidth: 120
    }}>
      <h3>{title}</h3>
      <strong>{value}</strong>
    </div>
  )
}
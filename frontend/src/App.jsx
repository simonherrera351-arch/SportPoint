import { Navigate, Route, Routes } from 'react-router-dom'
import { PrivateLayout, PublicLayout, RoleGate } from './components/Layout'
import { Calendario, ClubDetalle, Clubes, Home, Mapa, NotFound, Noticias, TorneoDetalle, Torneos } from './pages/Public'
import {
  MiClub, MiHistorial, Mensajes, MisClubes, MisEstadisticas, MisInscripciones, MisTorneos, NoticiasAdmin,
  Panel, Perfil, Plantilla, Reportes, Usuarios, ValidacionClubes,
} from './pages/Private'

const only = (roles, el) => <RoleGate roles={roles}>{el}</RoleGate>
const DEP = ['Deportista'], CLUB = ['Admin. Club'], ORG = ['Organizador'], ADM = ['Admin. Sistema']

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="clubes" element={<Clubes />} />
        <Route path="clubes/:id" element={<ClubDetalle />} />
        <Route path="torneos" element={<Torneos />} />
        <Route path="torneos/:id" element={<TorneoDetalle />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="noticias" element={<Noticias />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<PrivateLayout />}>
        <Route path="panel" element={<Panel />} />
        <Route path="perfil" element={only(DEP, <Perfil />)} />
        <Route path="mis-clubes" element={only(DEP, <MisClubes />)} />
        <Route path="mis-inscripciones" element={only(DEP, <MisInscripciones />)} />
        <Route path="mi-historial" element={only(DEP, <MiHistorial />)} />
        <Route path="mis-estadisticas" element={only(DEP, <MisEstadisticas />)} />
        <Route path="mi-club" element={only(CLUB, <MiClub />)} />
        <Route path="plantilla" element={only(CLUB, <Plantilla />)} />
        <Route path="mis-torneos" element={only(ORG, <MisTorneos />)} />
        <Route path="mensajes" element={only([...CLUB, ...ORG], <Mensajes />)} />
        <Route path="reportes" element={only([...CLUB, ...ADM], <Reportes />)} />
        <Route path="validacion-clubes" element={only(ADM, <ValidacionClubes />)} />
        <Route path="usuarios" element={only(ADM, <Usuarios />)} />
        <Route path="noticias-admin" element={only(ADM, <NoticiasAdmin />)} />
      </Route>
      <Route path="/index.html" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

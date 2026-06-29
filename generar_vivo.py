import random
import datetime
import os

AEROPUERTOS_ORIGEN = ["EHAM", "SGAS", "UBBB"]
AEROPUERTOS_TODOS = [
    "SKBO", "SEQM", "SVMI", "SBBR", "SPIM", "SLLP", "SCEL", "SABE", "SGAS", "SUAA",
    "LATI", "EDDI", "LOWW", "EBCI", "UMMS", "LBSF", "LKPR", "LDZA", "EKCH", "EHAM",
    "VIDP", "OSDI", "OERK", "OMDB", "OAKB", "OOMS", "OYSN", "OPKC", "UBBB", "OJAI"
]
OFFSETS = {
    "SKBO": -5, "SEQM": -5, "SVMI": -4, "SBBR": -3, "SPIM": -5, "SLLP": -4, 
    "SCEL": -3, "SABE": -3, "SGAS": -4, "SUAA": -3, "LATI": +2, "EDDI": +2, 
    "LOWW": +2, "EBCI": +2, "UMMS": +3, "LBSF": +3, "LKPR": +2, "LDZA": +2, 
    "EKCH": +2, "EHAM": +2, "VIDP": +5, "OSDI": +3, "OERK": +3, "OMDB": +4, 
    "OAKB": +4, "OOMS": +4, "OYSN": +3, "OPKC": +5, "UBBB": +2, "OJAI": +3
}

def utc_to_local(dt_utc, icao):
    """Convierte un datetime UTC a hora local del aeropuerto dado su offset."""
    return dt_utc + datetime.timedelta(hours=OFFSETS[icao])

def generar_datos_vivo():
    print("=== Generador VIVO: Aviones y Maletas Sincronizados ===")

    # Base de tiempo: UTC puro, sin importar la zona horaria del servidor
    ahora_utc = datetime.datetime.utcnow()
    print(f"Hora UTC actual: {ahora_utc.strftime('%Y-%m-%d %H:%M')} UTC")

    vuelos_extra = []
    envios_por_origen = {"EHAM": [], "SGAS": [], "UBBB": []}

    for i in range(30):
        origen = AEROPUERTOS_ORIGEN[i % len(AEROPUERTOS_ORIGEN)]
        destinos_validos = [a for a in AEROPUERTOS_TODOS if a != origen]
        destino = random.choice(destinos_validos)

        # ── Tiempo en UTC puro ────────────────────────────────────────────────
        # Despegue UTC: dentro de (i + 2) minutos desde ahora (en UTC)
        despegue_utc = ahora_utc + datetime.timedelta(minutes=i + 2)

        # Duración del vuelo: aleatoria entre 2 y 3 minutos (datos de prueba rápidos)
        duracion_min = random.randint(2, 3)
        llegada_utc = despegue_utc + datetime.timedelta(minutes=duracion_min)

        # La maleta llega al aeropuerto origen 1 minuto antes del despegue (UTC)
        llegada_maleta_utc = despegue_utc - datetime.timedelta(minutes=1)

        # ── Convertir a hora local para el TXT ───────────────────────────────
        # planes_vuelo.txt usa: hora local del ORIGEN para salida,
        #                       hora local del DESTINO para llegada
        despegue_local_origen  = utc_to_local(despegue_utc, origen)
        llegada_local_destino  = utc_to_local(llegada_utc, destino)

        str_despegue = despegue_local_origen.strftime("%H:%M")
        str_llegada  = llegada_local_destino.strftime("%H:%M")

        vuelos_extra.append(f"{origen}-{destino}-{str_despegue}-{str_llegada}-999\n")
        print(f"  Vuelo {i+1:02d}: {origen}->{destino} | UTC {despegue_utc.strftime('%H:%M')}->{llegada_utc.strftime('%H:%M')} | TXT local {str_despegue}->{str_llegada}")

        # ── Envío (maleta) ────────────────────────────────────────────────────
        # Los archivos _envios usan hora local del ORIGEN
        llegada_maleta_local = utc_to_local(llegada_maleta_utc, origen)
        fecha_maleta = llegada_maleta_local.strftime("%Y%m%d")
        hora_maleta  = llegada_maleta_local.strftime("%H")
        min_maleta   = llegada_maleta_local.strftime("%M")
        id_envio     = f"{origen}{(i+1):05d}"
        cantidad     = f"{random.randint(10, 30):03d}"
        id_cliente   = f"{random.randint(1, 9999999):07d}"
        linea_envio  = f"{id_envio}-{fecha_maleta}-{hora_maleta}-{min_maleta}-{destino}-{cantidad}-{id_cliente}\n"
        envios_por_origen[origen].append(linea_envio)

    # ── Escribir Vuelos ───────────────────────────────────────────────────────
    ruta_vuelos = os.path.join("backend", "data", "planes_vuelo.txt")
    if os.path.exists(ruta_vuelos):
        with open(ruta_vuelos, "r") as f:
            lineas_vuelos = f.readlines()
        # Eliminar vuelos de prueba anteriores (los que tienen capacidad 999)
        lineas_limpias = [l for l in lineas_vuelos if not l.strip().endswith("-999")]
        with open(ruta_vuelos, "w") as f:
            f.writelines(lineas_limpias)
            f.writelines(vuelos_extra)
        print(f"\nOK: 30 Vuelos extra inyectados en planes_vuelo.txt")

    # ── Escribir Maletas ──────────────────────────────────────────────────────
    # El nombre del archivo usa la fecha UTC actual (igual que el backend espera)
    fecha_hoy_utc = ahora_utc.strftime("%Y%m%d")
    for origen, lineas in envios_por_origen.items():
        ruta_envios = f"_envios_{origen}_{fecha_hoy_utc}.txt"
        with open(ruta_envios, "w") as f:
            f.writelines(lineas)
        print(f"OK: {ruta_envios} -> {len(lineas)} maletas generadas")

    print(f"\nFecha UTC usada para los archivos de envíos: {fecha_hoy_utc}")
    print("¡Listo! Sube los 3 TXT en la UI y reinicia el backend.")

if __name__ == "__main__":
    generar_datos_vivo()

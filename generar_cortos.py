import random
import datetime
import os

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

def generar_vuelos_cortos():
    print("=== Generador de Vuelos Cortos/Largos (Pruebas en Vivo) ===")
    
    ahora_utc = datetime.datetime.utcnow()
    print(f"Hora UTC actual: {ahora_utc.strftime('%H:%M')} UTC")
    print("Generando 20 vuelos divididos en 4 grupos (5 vuelos cada uno):")
    print(" - Grupo 1: 3 a 5 min (Dur: 3-5m)")
    print(" - Grupo 2: 55 a 59 min (Dur: 3-5m)")
    print(" - Grupo 3: 62 a 65 min (Dur: 3-5m)")
    print(" - Grupo 4: 62 a 65 min (Dur: 12 Horas)\n")
    
    lineas_txt = []
    
    # Cada rango tiene: (min_inicio_despegue, min_fin_despegue, dur_min, dur_max)
    rangos = [
        (3, 5, 3, 5),          # Grupo 1
        (55, 59, 3, 5),        # Grupo 2
        (62, 65, 3, 5),        # Grupo 3
        (62, 65, 720, 720)     # Grupo 4 (12 horas = 720 minutos)
    ]
    
    for idx_rango, (min_inicio, min_fin, dur_min, dur_max) in enumerate(rangos):
        for i in range(5):
            origen = random.choice(AEROPUERTOS_TODOS)
            destino = random.choice([a for a in AEROPUERTOS_TODOS if a != origen])
            
            minutos_despegue = random.randint(min_inicio, min_fin)
            despegue_utc = ahora_utc + datetime.timedelta(minutes=minutos_despegue)
            
            duracion_vuelo = random.randint(dur_min, dur_max)
            llegada_utc = despegue_utc + datetime.timedelta(minutes=duracion_vuelo)
            
            despegue_local = utc_to_local(despegue_utc, origen)
            llegada_local = utc_to_local(llegada_utc, destino)
            
            str_despegue = despegue_local.strftime("%H:%M")
            str_llegada = llegada_local.strftime("%H:%M")
            capacidad = "777"
            
            linea = f"{origen}-{destino}-{str_despegue}-{str_llegada}-{capacidad}\n"
            lineas_txt.append(linea)
            
            print(f"[Grupo {idx_rango+1}] {origen} -> {destino} | UTC: {despegue_utc.strftime('%H:%M')} | TXT (Local): {str_despegue} -> {str_llegada} | Dur: {duracion_vuelo}m")
        
    nombre_archivo = "vuelos_cortos.txt"
    with open(nombre_archivo, "w") as f:
        f.writelines(lineas_txt)
        
    print(f"\n¡Listo! Se ha creado el archivo '{nombre_archivo}' con 20 vuelos.")
    print("Súbelo de inmediato en el Panel de Administración de Vuelos para verlos despegar en vivo.")

if __name__ == "__main__":
    generar_vuelos_cortos()

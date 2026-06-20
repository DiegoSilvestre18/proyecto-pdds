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

def generar_datos_vivo():
    print("=== Generador VIVO: Aviones y Maletas Sincronizados ===")
    ahora = datetime.datetime.now()
    
    # Listas para guardar las líneas a escribir
    vuelos_extra = []
    envios_por_origen = {"EHAM": [], "SGAS": [], "UBBB": []}
    
    # Generamos 30 pares perfectos (1 avión = 1 maleta)
    for i in range(30):
        origen = AEROPUERTOS_ORIGEN[i % len(AEROPUERTOS_ORIGEN)]
        destinos_validos = [a for a in AEROPUERTOS_TODOS if a != origen]
        destino = random.choice(destinos_validos)
        
        # El avión despega en (i + 10) minutos para asegurar margen de tiempo para compilar y subir
        despegue_real = ahora + datetime.timedelta(minutes=i + 10)
        # La maleta llega al aeropuerto 1 minuto antes del despegue
        llegada_maleta_real = despegue_real - datetime.timedelta(minutes=1)
        
        # Aplicamos el GMT offset del ORIGEN al despegue
        despegue_ajustado = despegue_real + datetime.timedelta(hours=OFFSETS[origen])
        llegada_maleta_ajustada = llegada_maleta_real + datetime.timedelta(hours=OFFSETS[origen])
        
        # VUELO
        # La llegada real a su destino es 5-8 mins despues
        llegada_vuelo_real = despegue_real + datetime.timedelta(minutes=random.randint(5, 8))
        # Pero el archivo TXT requiere la HORA LOCAL del DESTINO, asi que le sumamos el offset del destino
        llegada_vuelo_ajustada = llegada_vuelo_real + datetime.timedelta(hours=OFFSETS[destino])
        
        str_despegue = despegue_ajustado.strftime("%H:%M")
        str_llegada = llegada_vuelo_ajustada.strftime("%H:%M")
        vuelos_extra.append(f"{origen}-{destino}-{str_despegue}-{str_llegada}-999\n")
        
        # MALETA
        fecha_maleta = llegada_maleta_ajustada.strftime("%Y%m%d")
        hora_maleta = llegada_maleta_ajustada.strftime("%H")
        min_maleta = llegada_maleta_ajustada.strftime("%M")
        id_envio = f"{origen}{(i+1):05d}"
        cantidad = f"{random.randint(10, 30):03d}" # 10 a 30 maletas para que se note
        id_cliente = f"{random.randint(1, 9999999):07d}"
        linea_envio = f"{id_envio}-{fecha_maleta}-{hora_maleta}-{min_maleta}-{destino}-{cantidad}-{id_cliente}\n"
        envios_por_origen[origen].append(linea_envio)

    # Escribir Vuelos
    ruta_vuelos = os.path.join("backend", "data", "planes_vuelo.txt")
    if os.path.exists(ruta_vuelos):
        with open(ruta_vuelos, "r") as f:
            lineas_vuelos = f.readlines()
        lineas_limpias = [l for l in lineas_vuelos if not l.strip().endswith("-999")]
        with open(ruta_vuelos, "w") as f:
            f.writelines(lineas_limpias)
            f.writelines(vuelos_extra)
        print("OK: 30 Vuelos extra inyectados en planes_vuelo.txt")

    # Escribir Maletas
    fecha_hoy = ahora.strftime("%Y%m%d")
    for origen, lineas in envios_por_origen.items():
        # Usamos la fecha real actual para el nombre del archivo (para que lo subas facil)
        ruta_envios = f"_envios_{origen}_{fecha_hoy}.txt"
        with open(ruta_envios, "w") as f:
            f.writelines(lineas)
        print(f"OK: Archivo de envíos {ruta_envios} generado con {len(lineas)} maletas.")

    print("\n¡Listo! Sube los 3 TXT en la UI y reinicia el backend.")

if __name__ == "__main__":
    generar_datos_vivo()

import random
import datetime

# Lista de aeropuertos válidos sacados del sistema
AEROPUERTOS = [
    "SKBO", "SEQM", "SVMI", "SBBR", "SPIM", "SLLP", "SCEL", "SABE", "SGAS", "SUAA",
    "LATI", "EDDI", "LOWW", "EBCI", "UMMS", "LBSF", "LKPR", "LDZA", "EKCH", "EHAM",
    "VIDP", "OSDI", "OERK", "OMDB", "OAKB", "OOMS", "OYSN", "OPKC", "UBBB", "OJAI"
]

def generar_archivo_envios(origen_icao, fecha_base_str, num_registros):
    fecha_base = datetime.datetime.strptime(fecha_base_str, "%Y%m%d")
    nombre_archivo = f"_envios_{origen_icao}_{fecha_base_str}.txt"
    
    # Destinos posibles excluyendo el origen
    destinos = [a for a in AEROPUERTOS if a != origen_icao]
    
    with open(nombre_archivo, "w") as f:
        for i in range(1, num_registros + 1):
            id_envio = f"{i:09d}" # 000000001
            
            # Hora aleatoria durante el día
            hora = random.randint(0, 23)
            minuto = random.randint(0, 59)
            
            # Destino aleatorio
            destino = random.choice(destinos)
            
            # Cantidad de maletas aleatoria entre 1 y 10 (formato de 3 dígitos, ej: 005, 010)
            cantidad = f"{random.randint(1, 10):03d}"
            
            # ID de cliente aleatorio (7 dígitos)
            id_cliente = f"{random.randint(1, 9999999):07d}"
            
            # Formato: id_envío-aaaammdd-hh-mm-dest-###-IdClien
            linea = f"{id_envio}-{fecha_base_str}-{hora:02d}-{minuto:02d}-{destino}-{cantidad}-{id_cliente}"
            
            f.write(linea + "\n")
            
    print(f"OK: Archivo '{nombre_archivo}' generado con {num_registros} envios.")

if __name__ == "__main__":
    import sys
    
    print("Generador de Datos Aleatorios para Dia a Dia")
    print("-" * 50)
    
    if len(sys.argv) < 3:
        print("Uso: python generar_datos.py <ORIGEN_ICAO> <FECHA_YYYYMMDD> [NUM_REGISTROS]")
        print("Ejemplo: python generar_datos.py SKBO 20260101 600")
        sys.exit(1)
        
    origen_arg = sys.argv[1].upper()
    fecha_arg = sys.argv[2]
    num_arg = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    
    if origen_arg not in AEROPUERTOS:
        print(f"Error: {origen_arg} no es un aeropuerto valido.")
        sys.exit(1)
        
    generar_archivo_envios(origen_icao=origen_arg, fecha_base_str=fecha_arg, num_registros=num_arg)
    
    print("-" * 50)
    print("¡Listo! Ve al Frontend y sube el archivo generado.")

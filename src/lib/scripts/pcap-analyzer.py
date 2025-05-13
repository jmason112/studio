import os, sys, json
import hashlib
from decimal import Decimal
#from scapy.all import *
from scapy.all import PcapReader
from scapy.all import sr1,TCP,IP,UDP,DNS,DNSQR,DNSRR
from scapy.all import sniff
import copy

# Custom JSON encoder to handle Decimal and bytes objects
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        return super().default(obj)

def writeFile(filepath, data):
    # Ensure the directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    fh = open(filepath, "w")
    fh.write(json.dumps(data, sort_keys=True, indent=4, separators=(',', ': '), cls=CustomJSONEncoder))
    fh.close()

def hashTCP(packet, flip=False):
    #tcpHash = hashlib.md5(
        #packet[IP].src + str(packet[IP][TCP].sport) + packet[IP].dst + str(packet[IP][TCP].dport)).hexdigest()
    if flip:
        tcpHash = packet[IP].dst + ":" + str(packet[IP][TCP].dport) + "->" + packet[IP].src + ":" + str(
            packet[IP][TCP].sport)
    else:
        tcpHash = packet[IP].src + ":" + str(packet[IP][TCP].sport) + "->" + packet[IP].dst + ":" + str(packet[IP][TCP].dport)
    return tcpHash


if(len(sys.argv) < 3):
    print ("Usage: python pcap-analyzer.py <input_folder> <output_folder>")
    sys.exit(2)

input_folder = sys.argv[1]
output_folder = sys.argv[2]


if(not os.path.isdir(input_folder)):
    print (f"Error: Input folder '{input_folder}' is not a valid directory.")
    sys.exit(2)

# Create output folder if it doesn't exist
if not os.path.isdir(output_folder):
    try:
        os.makedirs(output_folder, exist_ok=True)
        print(f"Created output directory: {output_folder}")
    except OSError as e:
        print(f"Error creating output directory {output_folder}: {e}")
        sys.exit(2)


input_folder = input_folder.rstrip("/")
output_folder = output_folder.rstrip("/")

tcpState = {}
dnsMapping={}
objectData={}
print(f"Processing PCAP files in folder: {input_folder}")
for file_name in os.listdir(input_folder):
    file_path = os.path.join(input_folder, file_name)
    if ".pcap" in file_name.lower() and os.path.isfile(file_path):
        print(f"Reading file: {file_path}")
        try:
            myreader = PcapReader(file_path)
            packet_count = 0
            while True:
                try:
                    packet = myreader.read_packet()
                    if packet is None:
                        break
                    packet_count += 1
                except EOFError:
                    # End of file reached
                    print(f"Finished reading {file_path} (EOF)")
                    break
                except Exception as e_read:
                    print(f"Error reading packet from {file_path}: {e_read}")
                    continue


                if not packet.haslayer("IP"):
                    continue

                if packet.haslayer("TCP"):
                    proto="TCP"
                    tcpflags_raw = packet.sprintf('%TCP.flags%')
                    tcpflags = [flag for flag in tcpflags_raw if flag.isalpha()]


                    hashed_packet = hashTCP(packet)
                    hashed_packet_flipped = hashTCP(packet, True)

                    if hashed_packet in tcpState:
                        # print ("Packet src to dst")
                        src = packet[IP].src
                        dst = packet[IP].dst
                        port = packet[TCP].dport
                        flow="upload"
                    elif hashed_packet_flipped in tcpState:
                        # print ("Packet dst to src")
                        src = packet[IP].dst
                        dst = packet[IP].src
                        port = packet[TCP].sport
                        flow="download"
                    else:
                        if "S" not in tcpflags: # Check for SYN flag
                            # print ("packet out of sync skipping")
                            continue
                        # print ("This is connection start")
                        src=packet[IP].src
                        dst=packet[IP].dst
                        flow="upload"
                        tcpState[hashed_packet] = "SYN"
                        port = packet[TCP].dport

                elif packet.haslayer("UDP"):
                    proto = "UDP"
                    port = packet[UDP].dport
                    flow = "upload"
                    src = packet[IP].src
                    dst = packet[IP].dst
                else:
                    proto="unknown"
                    port = 0 # Use a default numeric port for unknown
                    flow = "upload"
                    src = packet[IP].src
                    dst = packet[IP].dst


                if packet.haslayer("DNSRR"):
                    try:
                        # Iterate through DNSRR records if multiple exist
                        for i in range(packet[DNS].ancount):
                            dnsrr = packet[DNS].an[i]
                            rrname = dnsrr.rrname
                            rdata = dnsrr.rdata

                            if isinstance(rrname, bytes):
                                rrname = rrname.decode('utf-8', errors='ignore')
                            if isinstance(rdata, bytes) and dnsrr.type == 1: # Type A record, rdata is IP
                                 pass # rdata is IP string already if Scapy parsed it well
                            elif isinstance(rdata, bytes) and dnsrr.type == 5: # Type CNAME record
                                 rdata = rdata.decode('utf-8', errors='ignore')


                            # Ensure rdata is a string (IP or hostname) for DNS mapping key
                            if isinstance(rdata, str) or isinstance(rdata, bytes):
                                if isinstance(rdata, bytes):
                                    rdata_key = rdata.decode('utf-8', errors='ignore')
                                else:
                                    rdata_key = rdata
                                dnsMapping[packet[IP].src] = rrname # Map query source IP to resolved name
                                if dnsrr.type == 1: # A record
                                    dnsMapping[rdata_key] = rrname
                                elif dnsrr.type == 5: # CNAME
                                     # For CNAME, map the alias to the canonical name
                                    dnsMapping[rrname] = rdata_key


                    except Exception as e_dns:
                        print(f"Error processing DNS record: {e_dns}")
                        pass # Skip problematic DNS records
                    # We process DNS then continue to avoid double counting packet length
                    # as DNS parsing is for mapping, not traffic volume per se in this structure
                    # If you need to count DNS traffic volume, adjust this logic
                    # continue

                # Ensure port is string for dict key
                port_str = str(port)

                if src not in objectData:
                    objectData[src] = {}

                if proto not in objectData[src]:
                    objectData[src][proto] = {}

                if port_str not in objectData[src][proto]:
                    objectData[src][proto][port_str] = {}

                if dst not in objectData[src][proto][port_str]:
                    objectData[src][proto][port_str][dst] = {"firstseen" : packet.time, "lastseen": packet.time, "upload": 0, "download": 0}

                objectData[src][proto][port_str][dst]["lastseen"] = packet.time
                packet_len_str = packet.sprintf("%IP.len%")
                try:
                    packet_len = int(packet_len_str) if packet_len_str else 0
                except ValueError:
                    packet_len = 0 # Default to 0 if conversion fails

                objectData[src][proto][port_str][dst][flow] = objectData[src][proto][port_str][dst][flow] + packet_len
            print(f"Processed {packet_count} packets from {file_path}")
        except Scapy_Exception as e_scapy:
            print(f"Scapy error reading file {file_path}: {e_scapy}. Skipping this file.")
        except Exception as e_generic:
            print(f"Generic error processing file {file_path}: {e_generic}. Skipping this file.")


#Enrich Data
cpObjectData={}

for objSrc_ip in objectData: # objSrc_ip is an IP string
    # Use DNS mapping if available, otherwise use IP
    mappedSrc = dnsMapping.get(objSrc_ip, objSrc_ip)

    if isinstance(mappedSrc, bytes):
        mappedSrc = mappedSrc.decode('utf-8', errors='ignore')

    if mappedSrc not in cpObjectData:
        cpObjectData[mappedSrc] = {}

    for proto in objectData[objSrc_ip]:
        if proto not in cpObjectData[mappedSrc]:
            cpObjectData[mappedSrc][proto] = {}
        for port_str in objectData[objSrc_ip][proto]: # port_str is already a string
            if port_str not in cpObjectData[mappedSrc][proto]:
                cpObjectData[mappedSrc][proto][port_str] = {}
            for host_ip in objectData[objSrc_ip][proto][port_str]: # host_ip is an IP string
                mappedHost = dnsMapping.get(host_ip, host_ip)

                if isinstance(mappedHost, bytes):
                    mappedHost = mappedHost.decode('utf-8', errors='ignore')

                current_connection_data = objectData[objSrc_ip][proto][port_str][host_ip]

                if mappedHost not in cpObjectData[mappedSrc][proto][port_str]:
                    cpObjectData[mappedSrc][proto][port_str][mappedHost] = copy.deepcopy(current_connection_data)
                else:
                    # Aggregate data if entry already exists (e.g. due to multiple IPs mapping to same hostname)
                    existing_entry = cpObjectData[mappedSrc][proto][port_str][mappedHost]
                    existing_entry['download'] += current_connection_data['download']
                    existing_entry['upload'] += current_connection_data['upload']
                    if current_connection_data['firstseen'] < existing_entry['firstseen']:
                        existing_entry['firstseen'] = current_connection_data['firstseen']
                    if current_connection_data['lastseen'] > existing_entry['lastseen']:
                        existing_entry['lastseen'] = current_connection_data['lastseen']

# Convert DNS mapping to use only string keys and values
string_dns_mapping = {}
for key, value in dnsMapping.items():
    str_key = key.decode('utf-8', errors='replace') if isinstance(key, bytes) else str(key)
    str_value = value.decode('utf-8', errors='replace') if isinstance(value, bytes) else str(value)
    string_dns_mapping[str_key] = str_value

output_json_path = os.path.join(output_folder, "output.json")
dns_mapping_json_path = os.path.join(output_folder, "dnsMapping.json")

print(f"Writing output.json to {output_json_path}")
writeFile(output_json_path, cpObjectData)
print(f"Writing dnsMapping.json to {dns_mapping_json_path}")
writeFile(dns_mapping_json_path, string_dns_mapping)

print("PCAP analysis complete.")
print(f"TCP States Tracked: {len(tcpState)}")
print(f"DNS Mappings Found: {len(string_dns_mapping)}")
print(f"Output files generated in: {output_folder}")

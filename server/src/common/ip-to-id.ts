// using bitwise manipulation to convert kubernates IP to id using last two digits

export const ipToId = (ip: string) => {
    const octets = ip.split('.').map(Number);

    const lastOctet = octets[3];
    const secondLastOctet = octets[2];

    return (secondLastOctet << 8) | lastOctet;
};

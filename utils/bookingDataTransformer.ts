/**
 * Interface pour les données brutes de réservation
 */
interface RawBookingData {
    bookingResponse?: {
        data?: any;
    };
    paymentResponse?: {
        data?: any;
    };
    trip?: any;
    returnTrip?: any;
    passengers?: Array<any>;
}

/**
 * Extrait le nom de la compagnie depuis différentes sources
 */
const extractCompanyName = (...sources: Array<any>): string => {
    for (const source of sources) {
        if (!source) continue;
        const name = source?.companyName || source?.company?.name || source?.company;
        if (name) return name;
    }
    return 'N/A';
};

/**
 * Extrait la plaque d'immatriculation depuis différentes sources
 */
const extractLicencePlate = (...sources: Array<any>): string => {
    for (const source of sources) {
        if (!source) continue;
        const plate = source?.bus?.licencePlate || 
                     source?.bus?.licensePlate ||
                     source?.licencePlate ||
                     source?.licensePlate;
        if (plate) return plate;
    }
    return 'N/A';
};

/**
 * Traite les passagers depuis la réponse API ou les données passées
 */
const processPassengers = (bookingPassengers: Array<any> | undefined, fallbackPassengers: Array<any> | undefined, tripPrice: number): Array<any> => {
    if (bookingPassengers && bookingPassengers.length > 0) {
        // Si les passagers viennent de l'API, ils peuvent être groupés par leg
        const passengersMap = new Map<string, any>();
        
        bookingPassengers.forEach((p: any) => {
            const key = `${p.firstName}_${p.lastName}_${p.phone}_${p.email}`;
            
            if (!passengersMap.has(key)) {
                passengersMap.set(key, {
                    firstName: p.firstName || '',
                    lastName: p.lastName || '',
                    email: p.email || '',
                    phone: p.phone || '',
                    seatNumber: null,
                    seatNumberReturn: null,
                    isMainPassenger: p.isMainPassenger || false,
                    passengerType: p.passengerType || 'adult',
                    price: p.price || tripPrice || '0'
                });
            }
            
            const passenger = passengersMap.get(key)!;
            // Assigner le siège selon le leg
            if (p.leg === 'OUTBOUND' || p.leg === 'OUT') {
                passenger.seatNumber = p.seatNumber || passenger.seatNumber;
            } else if (p.leg === 'RETURN' || p.leg === 'RET') {
                passenger.seatNumberReturn = p.seatNumber || passenger.seatNumberReturn;
            } else {
                passenger.seatNumber = p.seatNumber || passenger.seatNumber;
            }
        });
        
        return Array.from(passengersMap.values());
    }
    
    if (fallbackPassengers && fallbackPassengers.length > 0) {
        return fallbackPassengers.map((p: any) => ({
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            email: p.email || '',
            phone: p.phone || '',
            seatNumber: p.seatNumber || null,
            seatNumberReturn: p.seatNumberReturn || null,
            isMainPassenger: p.isMainPassenger || false,
            passengerType: p.passengerType || 'adult',
            price: p.price || tripPrice || '0'
        }));
    }
    
    return [];
};

/**
 * Formate les données de réservation pour l'affichage
 */
export const transformBookingData = (rawData: RawBookingData) => {
    const { bookingResponse, paymentResponse, trip, returnTrip, passengers } = rawData;
    
    if (!bookingResponse?.data || !paymentResponse?.data) {
        return null;
    }

    console.log("bookingResponse.data.newBooking ==>, ", bookingResponse.data.newBooking)

    const booking = bookingResponse.data ;
    console.log("booking vaut maintenant ==>, ", booking)
    const payment = paymentResponse.data;
    const bookingId = bookingResponse.data?.newBooking ? bookingResponse.data?.newBooking?.id : booking.bookingId || booking.id;
    const bookingCode = bookingResponse.data?.newBooking ? bookingResponse.data?.newBooking?.code : booking.code || booking.bookingCode ;
    const creditRemaining = bookingResponse.data?.creditRemaining || 0;
    const remainingTokenCode = bookingResponse.data?.remainingTokenCode || '';
    
    // Extraire les informations du trajet
    const departureInfo = booking.departure || trip;
    const returnDepartureInfo = booking.returnDeparture || returnTrip;
    
    // Déterminer le type de trajet
    const tripType = booking.type || (returnTrip ? 'ROUND_TRIP' : 'ONE_WAY');
    const isRoundTrip = tripType === 'ROUND_TRIP';
    
    // Traiter les passagers
    const processedPassengers = processPassengers(
        booking.passengers,
        passengers,
        departureInfo?.price || trip?.price || 0
    );
    
    // Extraire les informations de la compagnie et du véhicule
    const outboundCompanyName = extractCompanyName(departureInfo, trip, booking);
    const outboundLicencePlate = extractLicencePlate(departureInfo, trip, booking);
    
    const returnCompanyName = isRoundTrip ? extractCompanyName(returnDepartureInfo, returnTrip) : null;
    const returnLicencePlate = isRoundTrip ? extractLicencePlate(returnDepartureInfo, returnTrip) : null;
    
    // Calculer les prix pour l'affichage
    const numberOfPassengers = processedPassengers.length || passengers?.length || 1;
    const outboundPricePerPerson = departureInfo?.price || trip?.price || 0;
    const returnPricePerPerson = isRoundTrip ? (returnDepartureInfo?.price || returnTrip?.price || 0) : 0;
    const outboundTotalPrice = outboundPricePerPerson * numberOfPassengers;
    const returnTotalPrice = isRoundTrip ? returnPricePerPerson * numberOfPassengers : 0;
    
    return {
        id: bookingId,
        code: bookingCode,
        status: payment.status || booking.status || 'PAID',
        totalAmount: payment.amount || booking.totalAmount || '0',
        currency: payment.currency || booking.currency || trip?.currency || 'XOF',
        method: payment.method || 'MOBILE_MONEY',
        provider: payment.provider || payment.paymentProvider || 'N/A',
        paymentProvider: payment.provider || payment.paymentProvider || 'N/A',
        createdAt: booking.createdAt || new Date().toISOString(),
        // Informations du voyage aller
        departureDateTime: departureInfo?.departureDateTime || trip?.departureDateTime || '',
        departureTime: departureInfo?.departureTime || trip?.departureTime || '',
        arrivalTime: departureInfo?.arrivalTime || trip?.arrivalTime || '',
        duration: departureInfo?.duration || trip?.duration || '',
        companyName: outboundCompanyName,
        bus: {
            licencePlate: outboundLicencePlate
        },
        trip: {
            label: departureInfo?.label || trip?.label || '',
            type: tripType,
            stationFrom: {
                city: departureInfo?.departureCity || trip?.departureCity || '',
                name: departureInfo?.departureStation || trip?.departureStation || ''
            },
            stationTo: {
                city: departureInfo?.arrivalCity || trip?.arrivalCity || '',
                name: departureInfo?.arrivalStation || trip?.arrivalStation || ''
            }
        },
        // Informations du voyage retour (si aller-retour)
        returnTrip: isRoundTrip ? {
            departureDateTime: returnDepartureInfo?.departureDateTime || returnTrip?.departureDateTime || '',
            departureTime: returnDepartureInfo?.departureTime || returnTrip?.departureTime || '',
            arrivalTime: returnDepartureInfo?.arrivalTime || returnTrip?.arrivalTime || '',
            duration: returnDepartureInfo?.duration || returnTrip?.duration || '',
            companyName: returnCompanyName,
            bus: {
                licencePlate: returnLicencePlate
            },
            stationFrom: {
                city: returnDepartureInfo?.departureCity || returnTrip?.departureCity || '',
                name: returnDepartureInfo?.departureStation || returnTrip?.departureStation || ''
            },
            stationTo: {
                city: returnDepartureInfo?.arrivalCity || returnTrip?.arrivalCity || '',
                name: returnDepartureInfo?.arrivalStation || returnTrip?.arrivalStation || ''
            },
            price: returnPricePerPerson
        } : null,
        // Prix pour l'affichage
        prices: {
            outboundPricePerPerson: outboundPricePerPerson,
            returnPricePerPerson: returnPricePerPerson,
            outboundTotalPrice: outboundTotalPrice,
            returnTotalPrice: returnTotalPrice,
            numberOfPassengers: numberOfPassengers
        },
        passengers: processedPassengers,
        contact: booking.contact || {},
        creditRemaining: creditRemaining,
        remainingTokenCode: remainingTokenCode
    };
};






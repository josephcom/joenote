---
created: 2026-08-20T08:05:40Z
updated: 2026-08-20T08:08:06Z
---

# Woomera East Electrical Refurbishment

## Introduction

Good morning everyone. My name is Joseph, I work as a project engineer for NHP, and I will present and perform the factory acceptance test items for the Woomera East Electrical Refurbishment project. Today also with me are Martin, project delivery manager, and the project manager, Ali.

I'm standing in front of the switchboard, which has been constructed as one continuous switchboard, installed inside an enclosure. The switchboard is air insulated and modular, where each panel has got a defined function, and for this particular project we're dealing with eight panels: seven circuit breakers and one bus VT panel with a bus earthing switch on top of it.

The first panel is the incomer, on which, in addition to the regular remote commands from SCADA, we also receive signals from the transformer. The regular remote signals from SCADA include open and close commands for the circuit breaker and the same two signals for the load break switch. The transformer signals include the oil over-pressure trip, the accumulation trip and the oil over-temperature trip, as well as one signal from the safety valve.

We also have one differential protection relay on the last circuit breaker, which is panel number seven. In case of a fault, this differential relay sends simultaneous signals to all the other circuit breakers and opens all of them.

## Panel Construction

Each circuit breaker panel comprises three major chambers or compartments.

The first one is the cable compartment, where the cables will be terminated. Apart from that, in the same compartment, we have the circuit breaker itself — the vacuum circuit breaker, or VCB as we sometimes call it — the earthing switch, the load break switch, CTs and surge resistors. These MV components are generally installed inside the cable compartment.

The second chamber is the LV compartment, where all the auxiliary and control wiring is done. In the same chamber, we've got the interlocking mechanism between the load break switch and the earthing switch, the capacitive voltage indicator, the signalling lamps, and a selector switch to enable or disable the remote commands from SCADA.

In addition to the usual LV compartment, for this project we have another extra LV compartment on top, where the protection relays are installed.

## The Front of the Panel

Starting from the very bottom, which is the cable compartment, we've got this lift-off door with a provision for padlocking right here. We've got these two windows to provide some visibility into the position of the earthing switch, so you can at any time see the position of the knives — whether they are open or closed — through these windows. There's a third window right here at the bottom left, which shows the mechanical indication of the Arc-Killer, about which I will talk in detail in due time.

The circuit breaker is a mechanical, spring-charged circuit breaker, which means that the energy to operate it comes from the stored energy of a spring. This spring can be charged either manually, by using this handle in the front, or — in the case of this project — by using an electric motor which does the charging automatically. As soon as the spring is discharged, the motor starts to charge it again, meaning there's nothing that we need to do about it.

Here we can see a mechanical indicator showing the position of the spring, whether it's charged or discharged. There's another mechanical indicator right here which shows the position of the VCB, whether it's open or closed. Down here we have these two mechanical push buttons through which you can operate the circuit breaker — close it, open it. Of course, using the mechanical push buttons is not the preferred way to operate the VCB, because it bypasses all the interlocking and safety measures that have been incorporated into the control diagram. For this reason, two transparent covers with padlocking facilities will be installed on these push buttons to prevent any unauthorised operation.

The last bit is this little counter, which shows how many times the VCB has been operated so far.

## Inside the Cable Compartment

To show what's going on inside the cable compartment, I'm going to open the door, like so. The first thing you can see is the VCB itself. It's a demountable circuit breaker, which means you can easily get it out of the panel by just disconnecting its connections. The circuit breaker is installed on four wheels, so you can easily slide it out and put it onto a trolley.

But to get it out, there are a few things that need to be disconnected. The first is the flexible cables that connect the circuit breaker to the main power circuit right here — it's a bolted connection, so you just need to unbolt it, and done. Apart from that, there's a whole bunch of wiring coming out of the VCB, going through this set of Harting plugs and then continuing on to the LV compartment — so the second thing to disconnect is this set of Harting plugs, like so; you just need to pull it up, and that's all. The last one is the two mechanical cables that connect the Arc-Killer system to the back flaps. So you just need to disconnect these three components before taking out the circuit breaker.

Apart from that, we also have these block type CTs, the earthing switch sitting here on the right wall, and up here we have the load break switch. We can also see this space heater sitting here, along with its thermostat right here.

## The Arc-Killer

Before I close the door, we have this opportunity to talk about the Arc-Killer. The Arc-Killer is a proprietary arc quenching system — basically a fast-acting switch attached to the circuit breaker itself. In case something happens inside either the cable compartment or the bus bar compartment, it provides a mechanism to convert the arc fault to a much more manageable, normal through-fault within 25 milliseconds.

The first part of this system is the movable flaps at the back wall. In the case of an arc fault, we will have a huge amount of expanding hot gases trying to rush out of the panel through the back flaps — that's where the flaps get pushed open. The second part of the system is a mechanical cable that connects these flaps to the trigger mechanism of the Arc-Killer. The flaps pull the cables, which in turn pull the trigger — that's where the Arc-Killer, which is basically another earthing switch, gets deployed and creates an intentional short circuit between the live cable and earth.

To get the system ready for deployment, we have to arm it. The arming might look a bit tricky, but bear in mind that this is not something that is done every day — you arm it once, and hopefully it will sit there happily for the rest of the lifetime of the switchboard. So I'm not going into too much detail about how I'm arming it; it's explained in detail in the operation manual that comes along with the switchboard. Please bear with me for a minute so I can arm it and get it ready for a simulated trigger.

The Arc-Killer is now armed, ready to be deployed. As I said before, there are two cable connections to it: one is connected to the back flaps inside the cable compartment, and the other goes to the back flaps in the bus bar compartment. If anything happens inside the cable compartment, that particular individual Arc-Killer will be deployed. However, since all the panels share the same bus bar compartment, in the case of any incident inside the bus bar compartment, usually multiple Arc-Killers will be triggered — and which one gets triggered first, and how many of them, depends very much on the severity of the incident.

As a result of an arc fault, there will be a lot of pressurised hot gases, and that is enough to push the back flaps and in turn pull the trigger. I'm going to simulate this by simply using this stick and pushing the flaps. I'll start from the cable compartment, and later I will do exactly the same in the bus bar compartment.

The bang, I'm pretty sure, was loud enough for everybody to hear, which means the Arc-Killer actually works as expected. Now I'm going to arm it again and do the same, this time in the bus bar compartment.

Like so — we've just managed to showcase how this system works as a whole. It's worth mentioning again that the purpose of this system is not to eliminate the fault; it converts an arc fault to a through-fault within 25 milliseconds.

## Interlocking Between the Load Break Switch, the Earthing Switch and the Door

Another aspect of the safe operation of these panels is the coordinated interlocking between the load break switch, the earthing switch and the front door. To be able to operate any of these components, there are some criteria that need to be met.

Starting with the load break switch: to close it, you want to make sure the earthing switch is not already closed — nobody wants to close a load break switch on a closed earthing switch — and the front door should be closed and secured in place. I'm going to showcase both of these criteria. First, I'll intentionally close the earthing switch and try to close the load break switch — as you can see, I can't do it. Next, I'll open the front door and try again — as you can see, I can't do this either. So, to close the load break switch, the earthing switch should be open and the front door should be closed and secured in place.

Moving on to the earthing switch: to close it, one criterion needs to be met — the load break switch should be open. Obviously, it doesn't make sense to close an earthing switch on a closed load break switch. I'm going to intentionally leave the load break switch closed and try to close the earthing switch — as you can see, I can't do it. The only way is to open the load break switch first, like so.

And lastly, the door itself. To lift the door off, two criteria need to be met: the earthing switch should be closed, and the load break switch should be open. Currently only one of these criteria is met — the load break switch is still closed — so let's see what happens if I try to lift the door off. As you can see, I can't do it. This time, I'm going to open the load break switch but keep the earthing switch open, and try again — I still can't. The only way is to keep the load break switch open and close the earthing switch, like so. Only then am I able to lift the door off, like so.

While the door is still open, it's a good opportunity to see what happens if I try to close the load break switch — as you can see, I can't do it. I should close the door and secure it in place first. Even if the door appears to be closed but is not quite secured, the operation is still not allowed.

## Key Interlocking and the Bus Earthing Switch

Finally, the last aspect of the safe operation of the switchboard is the key interlocking. As you can see, there is a barrel sitting next to the load break switch on each panel, and these keys coordinate the operation of the bus earthing switch.

The way it works is that the bus earthing switch cannot be closed unless we've got all the keys out from all the other panels, which means that the load break switch on each and every panel should be locked in open position. This is to ensure the safe operation of the bus earthing switch — we don't want to close a bus earthing switch on a live bus bar.

The way that this locking of the switches is ensured is that when you turn the key to get it out, it drives a little pin onto this little cavity on the shaft, and that pin is responsible for preventing you from inserting the operating handle and accidentally closing the switch. I'll show it here. Currently the load break switch is open; I'm going to lock it in place, like so, and get the key out. Once the key is out, as you can see, I can't push the handle all the way to the end of the shaft, so I can't operate it. If you want to get the pin out of the way, the only way is to put the key back in and turn it — and that's exactly where the key itself gets trapped in the barrel, so you can't just take it out to the bus earthing switch while this load break switch is free to operate.

So, in a nutshell: you can't close the bus earthing switch unless you have all the keys in hand, which means the load break switch on every panel is locked in open position.

## Capacitive Voltage Indicator

The last component on the LV compartment is this capacitive voltage indicator, which shows the presence or the absence of the voltage on the cable side. It has got this self-testing button on the front — you can push it and see the three indicators light up, showing that the device itself is healthy, like so. Once the switchboard is live, all three of them are permanently lit up.

## Closing

As far as the mechanical side of this test schedule is concerned, I think I've already covered all the applicable items in the schedule. If you all agree, it's about time we move on to the second part, which is the electrical function tests.


#temporary


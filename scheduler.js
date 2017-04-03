var moment = require('moment');
var mongoose = require('mongoose');
var storageAgent = require('nodejs-storage-agent');
var storageAuthentication = require('nodejs-storage-authentication');
// An internal class which handles agent scheduling
var scheduler = {
    // A delay between two processing operation packages
    interval: 50,
    // A set of timers which iterate over agents
    timers: [],
    // A set of agents to be processed
    agents: [],
    // Adds one agent to the processing queue
    attachAgent: function (agent) {
        scheduler.agents.push(agent);
    },
    // Adds a range of agent definitions to the list
    attachRange: function (range) {
        scheduler.agents = scheduler.agents.concat(range);
    },
    // Executes one given agent definition for one agent instance
    iterate: function (agentDefinition) {
        var currentTime = moment().utc();
        // The oldest time moment when no action is required for instances of such an agent
        var pastTime = moment().utc().subtract(agentDefinition.interval, 'seconds');
        // Update one outdated agent instance corresponding to the agent definition
        // This blocks it from being taken by other workers
        storageAgent.Agent.findOneAndUpdate({
            'token': mongoose.Types.ObjectId(agentDefinition.token),
            'updated': {
                $lt: pastTime
            }
        }, {
            'updated': currentTime
        }, function (error, agent) {
            if (null != error) {
                throw  error;
            }
            if (null != agent) {
                // Find agent's owner
                storageAuthentication.Account.findOne({
                    _id: agent.accountIdentifier
                }, function (error, account) {
                    if (null != error) {
                        throw error;
                    }
                    if (null == account) {
                        return;
                    }
                    agentDefinition.action(account);
                });
            }
        });
    },
    // Iterates over the agents list and executes them
    process: function () {
        for (var i = 0; i < scheduler.agents.length; i++) {
            var agent = scheduler.agents[i];
            scheduler.iterate(agent);
        }
    },
    // Starts one agent-processing timer and adds it to the timers list
    start: function () {
        var timer = setInterval(scheduler.process, scheduler.interval);
        scheduler.timers.push(timer);
    },
    // Stops all agent-processing timers
    stop: function () {
        for (var i = 0; i < scheduler.timers.length; i++) {
            var timer = scheduler.timers[i];
            clearInterval(timer);
        }
        scheduler.timers = [];
    }
};
// External scheduler interface
module.exports = {
    attachAgent: scheduler.attachAgent,
    attachRange: scheduler.attachRange,
    start: scheduler.start,
    stop: scheduler.stop
};